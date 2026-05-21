using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using System.Security.Claims;

namespace net_backend.Controllers
{
    /// <summary>
    /// Shared base for all API controllers.
    /// Single-division/division-less domain: no Company/Location/Division scoping helpers.
    /// </summary>
    [ApiController]
    [Authorize]
    public abstract class BaseController : ControllerBase
    {
        protected readonly ApplicationDbContext _context;

        protected BaseController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>User id from JWT <c>NameIdentifier</c>; 0 if no token.</summary>
        protected int CurrentUserId
        {
            get
            {
                var v = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                return int.TryParse(v, out var id) ? id : 0;
            }
        }

        protected async Task<bool> IsAdminAsync()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (string.Equals(role, nameof(Role.ADMIN), StringComparison.OrdinalIgnoreCase)) return true;
            var u = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == CurrentUserId);
            return u?.Role == Role.ADMIN;
        }

        /// <summary>Returns true if the current user has the given permission flag (admin always true).</summary>
        protected async Task<bool> HasPermissionAsync(string permissionKey)
        {
            if (await IsAdminAsync()) return true;

            var perms = await _context.UserPermissions.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == CurrentUserId);
            if (perms == null) return false;

            return permissionKey switch
            {
                // Dashboard
                nameof(perms.ViewDashboard) => perms.ViewDashboard,
                nameof(perms.ExportDashboard) => perms.ExportDashboard,

                // Master
                nameof(perms.ViewMaster) => perms.ViewMaster,
                nameof(perms.AddMaster) => perms.AddMaster,
                nameof(perms.EditMaster) => perms.EditMaster,
                nameof(perms.ImportMaster) => perms.ImportMaster,
                nameof(perms.ExportMaster) => perms.ExportMaster,
                nameof(perms.ManageParty) => perms.ManageParty,
                nameof(perms.ManageProduct) => perms.ManageProduct,
                nameof(perms.ManageItem) => perms.ManageItem,
                nameof(perms.ManageProcess) => perms.ManageProcess,
                nameof(perms.ManageBom) => perms.ManageBom,
                nameof(perms.ManageItemType) => perms.ManageItemType,
                nameof(perms.ManageItemCategory) => perms.ManageItemCategory,
                nameof(perms.ManageItemGroup) => perms.ManageItemGroup,
                nameof(perms.ManageProductCategory) => perms.ManageProductCategory,
                nameof(perms.ManageMaterial) => perms.ManageMaterial,
                nameof(perms.ManageUnit) => perms.ManageUnit,

                // Order
                nameof(perms.ViewOrder) => perms.ViewOrder,
                nameof(perms.CreateOrder) => perms.CreateOrder,
                nameof(perms.EditOrder) => perms.EditOrder,
                nameof(perms.ApproveOrder) => perms.ApproveOrder,

                // PI
                nameof(perms.ViewPI) => perms.ViewPI,
                nameof(perms.CreatePI) => perms.CreatePI,
                nameof(perms.EditPI) => perms.EditPI,
                nameof(perms.ApprovePI) => perms.ApprovePI,

                // PO
                nameof(perms.ViewPO) => perms.ViewPO,
                nameof(perms.CreatePO) => perms.CreatePO,
                nameof(perms.EditPO) => perms.EditPO,
                nameof(perms.ApprovePO) => perms.ApprovePO,

                // Inward
                nameof(perms.ViewInward) => perms.ViewInward,
                nameof(perms.CreateInward) => perms.CreateInward,
                nameof(perms.EditInward) => perms.EditInward,

                // QC
                nameof(perms.ViewQC) => perms.ViewQC,
                nameof(perms.CreateQC) => perms.CreateQC,
                nameof(perms.EditQC) => perms.EditQC,
                nameof(perms.ApproveQC) => perms.ApproveQC,

                // Job Work
                nameof(perms.ViewJobWork) => perms.ViewJobWork,
                nameof(perms.CreateJobWork) => perms.CreateJobWork,
                nameof(perms.EditJobWork) => perms.EditJobWork,

                // Production
                nameof(perms.ViewProduction) => perms.ViewProduction,
                nameof(perms.CreateProduction) => perms.CreateProduction,
                nameof(perms.EditProduction) => perms.EditProduction,

                // Delivery
                nameof(perms.ViewDelivery) => perms.ViewDelivery,
                nameof(perms.CreateDelivery) => perms.CreateDelivery,
                nameof(perms.EditDelivery) => perms.EditDelivery,

                // Reports / Traceability / Settings
                nameof(perms.ViewReports) => perms.ViewReports,
                nameof(perms.ViewTraceability) => perms.ViewTraceability,
                nameof(perms.AccessSettings) => perms.AccessSettings,
                nameof(perms.ManageUsers) => perms.ManageUsers,
                nameof(perms.ManageDocumentControl) => perms.ManageDocumentControl,

                _ => false
            };
        }

        protected async Task<bool> CanCreateMasterAsync(string moduleKey)
        {
            if (await IsAdminAsync()) return true;
            return await HasPermissionAsync(nameof(UserPermission.ViewMaster))
                && await HasPermissionAsync(nameof(UserPermission.AddMaster))
                && await HasPermissionAsync(moduleKey);
        }

        protected async Task<bool> CanEditMasterAsync(string moduleKey)
        {
            if (await IsAdminAsync()) return true;
            return await HasPermissionAsync(nameof(UserPermission.ViewMaster))
                && await HasPermissionAsync(nameof(UserPermission.EditMaster))
                && await HasPermissionAsync(moduleKey);
        }

        /// <summary>Returns a 403 result with a consistent <see cref="ApiResponse{T}"/> shape.</summary>
        protected ActionResult Forbidden(string message = "You do not have permission to perform this action.")
            => StatusCode(403, new ApiResponse<object> { Success = false, Message = message });

        /// <summary>Returns a 400 result with a consistent <see cref="ApiResponse{T}"/> shape.</summary>
        protected ActionResult BadResponse(string message)
            => BadRequest(new ApiResponse<object> { Success = false, Message = message });

        /// <summary>Returns a 404 result with a consistent <see cref="ApiResponse{T}"/> shape.</summary>
        protected ActionResult NotFoundResponse(string message = "Not found.")
            => NotFound(new ApiResponse<object> { Success = false, Message = message });
    }
}
