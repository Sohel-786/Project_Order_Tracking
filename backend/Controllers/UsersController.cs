using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/users")]
    public class UsersController : BaseController
    {
        private readonly string _aesKey;
        public UsersController(ApplicationDbContext context, IConfiguration configuration) : base(context)
        {
            _aesKey = configuration["PasswordEncryption:Key"] ?? throw new InvalidOperationException("PasswordEncryption:Key is not configured.");
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageUsers)) && !await IsAdminAsync()) return Forbidden();

            var q = _context.Users.AsNoTracking().AsQueryable();
            if (activeOnly == true) q = q.Where(u => u.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(u => u.Username.ToLower().Contains(s) ||
                                 u.FirstName.ToLower().Contains(s) ||
                                 u.LastName.ToLower().Contains(s) ||
                                 (u.Email ?? "").ToLower().Contains(s));
            }
            q = q.OrderByDescending(u => u.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var list = await q.Select(u => new
            {
                u.Id, u.Username, u.FirstName, u.LastName,
                Role = u.Role.ToString(),
                u.IsActive, u.Avatar, u.MobileNumber, u.Email, u.CreatedAt, u.UpdatedAt,
            }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = list, TotalCount = total });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageUsers)) && id != CurrentUserId && !await IsAdminAsync()) return Forbidden();
            var u = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (u == null) return NotFoundResponse("User not found.");

            string? decrypted = null;
            if (!string.IsNullOrEmpty(u.EncryptedPassword) && await IsAdminAsync())
            {
                try { decrypted = AesHelper.Decrypt(u.EncryptedPassword, _aesKey); } catch { }
            }

            return Ok(new ApiResponse<object> { Data = new
            {
                u.Id, u.Username, u.FirstName, u.LastName,
                Role = u.Role.ToString(), u.IsActive, u.Avatar, u.MobileNumber, u.Email,
                u.CreatedAt, u.UpdatedAt,
                DecryptedPassword = decrypted,
            }});
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateUserRequest body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageUsers)) && !await IsAdminAsync()) return Forbidden();

            if (string.IsNullOrWhiteSpace(body.Username) || string.IsNullOrWhiteSpace(body.Password))
                return BadResponse("Username and password are required.");
            if (await _context.Users.AnyAsync(u => u.Username == body.Username))
                return BadResponse("Username already exists.");

            if (!Enum.TryParse<Role>(body.Role, true, out var role)) role = Role.USER;

            var user = new User
            {
                Username = body.Username.Trim(),
                Password = BCrypt.Net.BCrypt.HashPassword(body.Password),
                EncryptedPassword = AesHelper.Encrypt(body.Password, _aesKey),
                FirstName = body.FirstName.Trim(),
                LastName  = body.LastName.Trim(),
                Role = role,
                IsActive = body.IsActive,
                Avatar = body.Avatar,
                MobileNumber = body.MobileNumber,
                Email = body.Email,
                CreatedBy = CurrentUserId,
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var perm = role == Role.ADMIN
                ? AdminDefaultPermission(user.Id)
                : DefaultNonAdminPermissions.Create(user.Id);
            _context.UserPermissions.Add(perm);
            await _context.SaveChangesAsync();

            return await GetById(user.Id);
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Update(int id, [FromBody] UpdateUserRequest body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageUsers)) && id != CurrentUserId && !await IsAdminAsync()) return Forbidden();
            var u = await _context.Users.FirstOrDefaultAsync(x => x.Id == id);
            if (u == null) return NotFoundResponse("User not found.");

            if (!string.IsNullOrWhiteSpace(body.Username) && body.Username != u.Username)
            {
                if (await _context.Users.AnyAsync(x => x.Id != id && x.Username == body.Username))
                    return BadResponse("Username already exists.");
                u.Username = body.Username.Trim();
            }
            if (!string.IsNullOrWhiteSpace(body.FirstName)) u.FirstName = body.FirstName.Trim();
            if (!string.IsNullOrWhiteSpace(body.LastName))  u.LastName  = body.LastName.Trim();
            if (!string.IsNullOrWhiteSpace(body.Role) && Enum.TryParse<Role>(body.Role, true, out var role)) u.Role = role;
            if (body.IsActive.HasValue) u.IsActive = body.IsActive.Value;
            u.Avatar = body.Avatar ?? u.Avatar;
            u.MobileNumber = body.MobileNumber ?? u.MobileNumber;
            u.Email = body.Email ?? u.Email;

            if (!string.IsNullOrWhiteSpace(body.Password))
            {
                u.Password = BCrypt.Net.BCrypt.HashPassword(body.Password);
                u.EncryptedPassword = AesHelper.Encrypt(body.Password, _aesKey);
            }
            u.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return await GetById(u.Id);
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            if (!await IsAdminAsync()) return Forbidden();
            if (id == CurrentUserId) return BadResponse("Cannot delete the currently logged-in user.");
            var u = await _context.Users.FirstOrDefaultAsync(x => x.Id == id);
            if (u == null) return NotFoundResponse("User not found.");
            _context.Users.Remove(u);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id } });
        }

        private static UserPermission AdminDefaultPermission(int userId) => new()
        {
            UserId = userId,
            ViewDashboard = true, ExportDashboard = true,
            ViewMaster = true, AddMaster = true, EditMaster = true, ImportMaster = true, ExportMaster = true,
            ManageParty = true, ManageProduct = true, ManageItem = true, ManageProcess = true, ManageBom = true,
            ManageItemType = true, ManageItemCategory = true, ManageItemGroup = true,
            ManageProductCategory = true, ManageMaterial = true, ManageUnit = true,
            ViewOrder = true, CreateOrder = true, EditOrder = true, ApproveOrder = true,
            ViewPI = true, CreatePI = true, EditPI = true, ApprovePI = true,
            ViewPO = true, CreatePO = true, EditPO = true, ApprovePO = true,
            ViewInward = true, CreateInward = true, EditInward = true,
            ViewQC = true, CreateQC = true, EditQC = true, ApproveQC = true,
            ViewJobWork = true, CreateJobWork = true, EditJobWork = true,
            ViewProduction = true, CreateProduction = true, EditProduction = true,
            ViewDelivery = true, CreateDelivery = true, EditDelivery = true,
            ViewReports = true, ViewTraceability = true,
            AccessSettings = true, ManageUsers = true, ManageDocumentControl = true,
            NavigationLayout = "SIDEBAR",
        };
    }
}
