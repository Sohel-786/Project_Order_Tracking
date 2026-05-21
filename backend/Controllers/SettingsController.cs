using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using System.Security.Claims;

namespace net_backend.Controllers
{
    [Route("api/settings")]
    [ApiController]
    [Authorize]
    public class SettingsController : BaseController
    {
        private readonly IWebHostEnvironment _env;
        private readonly string _aesKey;

        public SettingsController(ApplicationDbContext context, IWebHostEnvironment env, IConfiguration configuration)
            : base(context)
        {
            _env = env;
            _aesKey = configuration["PasswordEncryption:Key"]
                ?? throw new InvalidOperationException("PasswordEncryption:Key is not configured.");
        }

        // ───────────────────────────────────────────── Software profile

        [AllowAnonymous]
        [HttpGet("software")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> GetSoftwareSettings()
        {
            var settings = await _context.AppSettings.OrderByDescending(s => s.Id).FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings
                {
                    CompanyName = "Company",
                    SoftwareName = "Project Order Tracking",
                    PrimaryColor = "#0d6efd"
                };
                _context.AppSettings.Add(settings);
                await _context.SaveChangesAsync();
            }
            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }

        [HttpPut("software")]
        [HttpPatch("software")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> UpdateSoftwareSettings([FromBody] UpdateSettingsRequest request)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.AccessSettings))) return Forbidden();

            var settings = await _context.AppSettings.OrderByDescending(s => s.Id).FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings();
                _context.AppSettings.Add(settings);
            }

            if (request.CompanyName    != null) settings.CompanyName    = request.CompanyName.Trim();
            if (request.SoftwareName   != null) settings.SoftwareName   = request.SoftwareName.Trim();
            if (request.Address        != null) settings.Address        = request.Address.Trim();
            if (request.GstNo          != null) settings.GstNo          = request.GstNo.Trim();
            if (request.ContactNumber  != null) settings.ContactNumber  = request.ContactNumber.Trim();
            if (request.Email          != null) settings.Email          = request.Email.Trim();

            if (request.PrimaryColor != null)
            {
                var color = request.PrimaryColor.Trim();
                if (System.Text.RegularExpressions.Regex.IsMatch(color, "^#[0-9A-Fa-f]{6}$"))
                    settings.PrimaryColor = color;
            }

            settings.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }

        [HttpPost("software/logo")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> UploadSoftwareLogo([FromForm] IFormFile? logo)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.AccessSettings))) return Forbidden();

            var file = logo ?? Request.Form.Files.FirstOrDefault(f => f.Name == "logo" || f.Length > 0);
            if (file == null || file.Length == 0)
                return BadResponse("No file uploaded.");

            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            if (string.IsNullOrEmpty(ext) || !allowed.Contains(ext))
                return BadResponse("Only image files (jpg, jpeg, png, gif, webp) are allowed.");

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "storage", "software");
            Directory.CreateDirectory(dir);

            var fileName = $"logo{ext}";
            var fullPath = Path.GetFullPath(Path.Combine(dir, fileName));
            if (!fullPath.StartsWith(Path.GetFullPath(dir), StringComparison.OrdinalIgnoreCase))
                return BadResponse("Invalid path.");

            foreach (var existing in Directory.GetFiles(dir, "logo.*"))
            {
                var existingFullPath = Path.GetFullPath(existing);
                if (string.Equals(existingFullPath, fullPath, StringComparison.OrdinalIgnoreCase)) continue;
                try { System.IO.File.Delete(existingFullPath); } catch { /* best effort */ }
            }

            await using (var stream = System.IO.File.Create(fullPath))
                await file.CopyToAsync(stream);

            var url = $"/storage/software/{fileName}?v={DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";

            var settings = await _context.AppSettings.OrderByDescending(s => s.Id).FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings();
                _context.AppSettings.Add(settings);
            }
            settings.LogoUrl = url;
            settings.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }

        // ───────────────────────────────────────────── Permissions

        [HttpGet("permissions/me")]
        public async Task<ActionResult<ApiResponse<UserPermission>>> GetMyPermissions()
        {
            if (CurrentUserId == 0)
                return Unauthorized(new ApiResponse<UserPermission> { Success = false, Message = "User ID not found" });

            var user = await _context.Users.FindAsync(CurrentUserId);
            if (user == null)
                return NotFound(new ApiResponse<UserPermission> { Success = false, Message = "User not found" });

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == CurrentUserId);
            if (permissions == null)
            {
                permissions = user.Role == Role.ADMIN
                    ? AdminFullPermissions(user.Id)
                    : DefaultNonAdminPermissions.Create(user.Id);
                _context.UserPermissions.Add(permissions);
                await _context.SaveChangesAsync();
            }
            return Ok(new ApiResponse<UserPermission> { Data = permissions });
        }

        [HttpGet("permissions/user/{userId:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetUserPermissions(int userId)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.AccessSettings)) && userId != CurrentUserId)
                return Forbidden();

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (targetUser == null) return NotFoundResponse("User not found");

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId)
                ?? (targetUser.Role == Role.ADMIN ? AdminFullPermissions(userId) : DefaultNonAdminPermissions.Create(userId));

            return Ok(new ApiResponse<object> { Data = new { Permissions = permissions } });
        }

        [HttpPut("permissions/user/{userId:int}")]
        public async Task<ActionResult<ApiResponse<object>>> UpdatePermissions(int userId, [FromBody] UpdateUserPermissionsRequest request)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.AccessSettings))) return Forbidden();
            if (request.Permissions == null) return BadResponse("Permissions data is required");

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (targetUser == null) return NotFoundResponse("User not found");

            var perms = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (perms == null)
            {
                perms = new UserPermission { UserId = userId };
                _context.UserPermissions.Add(perms);
            }

            var u = request.Permissions;
            // Dashboard
            perms.ViewDashboard         = u.ViewDashboard;
            perms.ExportDashboard       = u.ExportDashboard;
            // Master
            perms.ViewMaster            = u.ViewMaster;
            perms.AddMaster             = u.AddMaster;
            perms.EditMaster            = u.EditMaster;
            perms.ImportMaster          = u.ImportMaster;
            perms.ExportMaster          = u.ExportMaster;
            perms.ManageParty           = u.ManageParty;
            perms.ManageProduct         = u.ManageProduct;
            perms.ManageItem            = u.ManageItem;
            perms.ManageProcess         = u.ManageProcess;
            perms.ManageBom             = u.ManageBom;
            perms.ManageItemType        = u.ManageItemType;
            perms.ManageItemCategory    = u.ManageItemCategory;
            perms.ManageItemGroup       = u.ManageItemGroup;
            perms.ManageProductCategory = u.ManageProductCategory;
            perms.ManageMaterial        = u.ManageMaterial;
            perms.ManageUnit            = u.ManageUnit;
            // Order
            perms.ViewOrder             = u.ViewOrder;
            perms.CreateOrder           = u.CreateOrder;
            perms.EditOrder             = u.EditOrder;
            perms.ApproveOrder          = u.ApproveOrder;
            // PI/PO
            perms.ViewPI = u.ViewPI; perms.CreatePI = u.CreatePI; perms.EditPI = u.EditPI; perms.ApprovePI = u.ApprovePI;
            perms.ViewPO = u.ViewPO; perms.CreatePO = u.CreatePO; perms.EditPO = u.EditPO; perms.ApprovePO = u.ApprovePO;
            // Inward/QC/JW
            perms.ViewInward = u.ViewInward; perms.CreateInward = u.CreateInward; perms.EditInward = u.EditInward;
            perms.ViewQC = u.ViewQC; perms.CreateQC = u.CreateQC; perms.EditQC = u.EditQC; perms.ApproveQC = u.ApproveQC;
            perms.ViewJobWork = u.ViewJobWork; perms.CreateJobWork = u.CreateJobWork; perms.EditJobWork = u.EditJobWork;
            // Production/Delivery
            perms.ViewProduction = u.ViewProduction; perms.CreateProduction = u.CreateProduction; perms.EditProduction = u.EditProduction;
            perms.ViewDelivery = u.ViewDelivery; perms.CreateDelivery = u.CreateDelivery; perms.EditDelivery = u.EditDelivery;
            // Reports & settings
            perms.ViewReports           = u.ViewReports;
            perms.ViewTraceability      = u.ViewTraceability;
            perms.AccessSettings        = u.AccessSettings;
            perms.ManageUsers           = u.ManageUsers;
            perms.ManageDocumentControl = u.ManageDocumentControl;
            perms.NavigationLayout      = string.IsNullOrWhiteSpace(u.NavigationLayout) ? "SIDEBAR" : u.NavigationLayout;
            perms.UpdatedAt             = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = perms });
        }

        // ───────────────────────────────────────────── System reset

        [HttpPost("reset-system")]
        public async Task<IActionResult> ResetSystem()
        {
            if (!await IsAdminAsync()) return Forbidden();

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Transactional
                _context.DeliveryChallanItems.RemoveRange(_context.DeliveryChallanItems);
                _context.DeliveryChallans.RemoveRange(_context.DeliveryChallans);
                _context.ProductionConsumptions.RemoveRange(_context.ProductionConsumptions);
                _context.ProductionEntries.RemoveRange(_context.ProductionEntries);
                _context.QcItems.RemoveRange(_context.QcItems);
                _context.QcEntries.RemoveRange(_context.QcEntries);
                _context.InwardLines.RemoveRange(_context.InwardLines);
                _context.Inwards.RemoveRange(_context.Inwards);
                _context.JobWorkItems.RemoveRange(_context.JobWorkItems);
                _context.JobWorks.RemoveRange(_context.JobWorks);
                _context.PurchaseOrderItems.RemoveRange(_context.PurchaseOrderItems);
                _context.PurchaseOrders.RemoveRange(_context.PurchaseOrders);
                _context.PurchaseIndentItems.RemoveRange(_context.PurchaseIndentItems);
                _context.PurchaseIndents.RemoveRange(_context.PurchaseIndents);
                _context.OrderBomItemPlans.RemoveRange(_context.OrderBomItemPlans);
                _context.OrderItems.RemoveRange(_context.OrderItems);
                _context.Orders.RemoveRange(_context.Orders);

                // BOM & Master data
                _context.BomItemProcesses.RemoveRange(_context.BomItemProcesses);
                _context.BomItems.RemoveRange(_context.BomItems);
                _context.Boms.RemoveRange(_context.Boms);
                _context.Items.RemoveRange(_context.Items);
                _context.Products.RemoveRange(_context.Products);
                _context.Processes.RemoveRange(_context.Processes);
                _context.Parties.RemoveRange(_context.Parties);
                _context.Materials.RemoveRange(_context.Materials);
                _context.Units.RemoveRange(_context.Units);
                _context.ProductCategories.RemoveRange(_context.ProductCategories);
                _context.ItemGroups.RemoveRange(_context.ItemGroups);
                _context.ItemCategories.RemoveRange(_context.ItemCategories);
                _context.ItemTypes.RemoveRange(_context.ItemTypes);

                // Codes / sequences / audit / users
                _context.CodeSequences.RemoveRange(_context.CodeSequences);
                _context.AuditLogs.RemoveRange(_context.AuditLogs);
                _context.UserPermissions.RemoveRange(_context.UserPermissions);
                _context.Users.RemoveRange(_context.Users);
                _context.AppSettings.RemoveRange(_context.AppSettings);

                await _context.SaveChangesAsync();

                // Best-effort wipe of uploads (keep software branding)
                try
                {
                    var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
                    var storageRoot = Path.Combine(webRoot, "storage");
                    if (Directory.Exists(storageRoot))
                    {
                        foreach (var dir in Directory.GetDirectories(storageRoot))
                        {
                            var name = new DirectoryInfo(dir).Name;
                            if (string.Equals(name, "software", StringComparison.OrdinalIgnoreCase)) continue;
                            try { Directory.Delete(dir, recursive: true); } catch { }
                        }
                    }
                }
                catch { }

                DbInitializer.Initialize(_context, _aesKey);

                await transaction.CommitAsync();
                return Ok(new ApiResponse<string>
                {
                    Success = true,
                    Message = "System reset completed. Please log in again with the seeded admin account.",
                    Data = "Success"
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiResponse<string> { Success = false, Message = ex.Message });
            }
        }

        // ───────────────────────────────────────────── Helper: full-admin permissions template

        private static UserPermission AdminFullPermissions(int userId) => new()
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
