using net_backend.Models;

namespace net_backend.Services
{
    /// <summary>
    /// Default permission template applied when a new non-admin user is created.
    /// Pattern: View + Create allowed on operational modules; Approve / Settings reserved.
    /// </summary>
    public static class DefaultNonAdminPermissions
    {
        public static UserPermission Create(int userId)
        {
            var now = DateTime.Now;
            return new UserPermission
            {
                UserId = userId,
                CreatedAt = now,
                UpdatedAt = now,

                // Dashboard
                ViewDashboard = true,
                ExportDashboard = false,

                // Master Data — view + add
                ViewMaster = true,
                AddMaster = true,
                EditMaster = false,
                ImportMaster = false,
                ExportMaster = false,
                ManageParty = true,
                ManageProduct = true,
                ManageItem = true,
                ManageProcess = false,
                ManageBom = true,
                ManageItemType = true,
                ManageItemCategory = true,
                ManageItemGroup = true,
                ManageProductCategory = true,
                ManageMaterial = true,
                ManageUnit = true,

                // Orders
                ViewOrder = true,
                CreateOrder = true,
                EditOrder = false,
                ApproveOrder = false,

                // Purchasing
                ViewPI = true,
                CreatePI = true,
                EditPI = false,
                ApprovePI = false,
                ViewPO = true,
                CreatePO = true,
                EditPO = false,
                ApprovePO = false,

                // Inward / QC / Job Work
                ViewInward = true,
                CreateInward = true,
                EditInward = false,
                ViewQC = true,
                CreateQC = true,
                EditQC = false,
                ApproveQC = false,
                ViewJobWork = true,
                CreateJobWork = true,
                EditJobWork = false,

                // Production / Delivery
                ViewProduction = true,
                CreateProduction = true,
                EditProduction = false,
                ViewDelivery = true,
                CreateDelivery = true,
                EditDelivery = false,

                // Reports & Traceability
                ViewReports = true,
                ViewTraceability = true,

                // Settings reserved
                AccessSettings = false,
                ManageUsers = false,
                ManageDocumentControl = false,

                NavigationLayout = "SIDEBAR"
            };
        }
    }
}
