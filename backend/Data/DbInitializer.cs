using net_backend.Models;
using net_backend.Services;

namespace net_backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context, string aesKey)
        {
            // 1. App Settings (single row)
            if (!context.AppSettings.Any())
            {
                context.AppSettings.Add(new AppSettings
                {
                    CompanyName = "Aira Euro Automation Pvt Ltd",
                    SoftwareName = "Project Order Tracking",
                    PrimaryColor = "#0d6efd",
                    Address = "8, Ajmeri Estate, Industrial Area, Ahmedabad, Gujarat, India",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                });
                context.SaveChanges();
            }

            // 2. Admin user
            var adminUser = context.Users.FirstOrDefault(u => u.Username == "mitul");
            if (adminUser == null)
            {
                adminUser = new User
                {
                    Username = "mitul",
                    FirstName = "Mitul",
                    LastName = "Admin",
                    Password = BCrypt.Net.BCrypt.HashPassword("admin"),
                    EncryptedPassword = AesHelper.Encrypt("admin", aesKey),
                    Role = Role.ADMIN,
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };
                context.Users.Add(adminUser);
                context.SaveChanges();
            }

            // 3. Admin permissions (full)
            var adminPerm = context.UserPermissions.FirstOrDefault(p => p.UserId == adminUser.Id);
            if (adminPerm == null)
            {
                adminPerm = new UserPermission
                {
                    UserId = adminUser.Id,
                    ViewDashboard = true,
                    ExportDashboard = true,
                    ViewMaster = true,
                    AddMaster = true,
                    EditMaster = true,
                    ImportMaster = true,
                    ExportMaster = true,
                    ManageParty = true,
                    ManageProduct = true,
                    ManageItem = true,
                    ManageProcess = true,
                    ManageBom = true,
                    ManageItemType = true,
                    ManageItemCategory = true,
                    ManageItemGroup = true,
                    ManageProductCategory = true,
                    ManageMaterial = true,
                    ManageUnit = true,
                    ViewOrder = true,
                    CreateOrder = true,
                    EditOrder = true,
                    ApproveOrder = true,
                    ViewPI = true,
                    CreatePI = true,
                    EditPI = true,
                    ApprovePI = true,
                    ViewPO = true,
                    CreatePO = true,
                    EditPO = true,
                    ApprovePO = true,
                    ViewInward = true,
                    CreateInward = true,
                    EditInward = true,
                    ViewQC = true,
                    CreateQC = true,
                    EditQC = true,
                    ApproveQC = true,
                    ViewJobWork = true,
                    CreateJobWork = true,
                    EditJobWork = true,
                    ViewProduction = true,
                    CreateProduction = true,
                    EditProduction = true,
                    ViewDelivery = true,
                    CreateDelivery = true,
                    EditDelivery = true,
                    ViewReports = true,
                    ViewTraceability = true,
                    AccessSettings = true,
                    ManageUsers = true,
                    ManageDocumentControl = true,
                    NavigationLayout = "SIDEBAR",
                };
                context.UserPermissions.Add(adminPerm);
                context.SaveChanges();
            }

            // 4. Default Units
            if (!context.Units.Any())
            {
                context.Units.AddRange(
                    new Unit { Name = "Numbers", Symbol = "NOS" },
                    new Unit { Name = "Kilograms", Symbol = "KG" },
                    new Unit { Name = "Metres", Symbol = "MTR" },
                    new Unit { Name = "Pieces", Symbol = "PCS" },
                    new Unit { Name = "Litres", Symbol = "LTR" }
                );
                context.SaveChanges();
            }

            // 5. Default Materials
            if (!context.Materials.Any())
            {
                context.Materials.AddRange(
                    new Material { Name = "Cast Iron" },
                    new Material { Name = "Carbon Steel" },
                    new Material { Name = "Stainless Steel" },
                    new Material { Name = "Brass" },
                    new Material { Name = "Aluminium" }
                );
                context.SaveChanges();
            }

            // 6. Default Item categories / types / groups
            if (!context.ItemCategories.Any())
            {
                context.ItemCategories.AddRange(
                    new ItemCategory { Name = "Casting" },
                    new ItemCategory { Name = "Forging" },
                    new ItemCategory { Name = "Fasteners" },
                    new ItemCategory { Name = "Trim" },
                    new ItemCategory { Name = "Bought-Out" }
                );
                context.SaveChanges();
            }
            if (!context.ItemTypes.Any())
            {
                context.ItemTypes.AddRange(
                    new ItemType { Name = "Raw" },
                    new ItemType { Name = "Semi-Finished" },
                    new ItemType { Name = "Bought-Out" }
                );
                context.SaveChanges();
            }
            if (!context.ItemGroups.Any())
            {
                context.ItemGroups.AddRange(
                    new ItemGroup { Name = "Body" },
                    new ItemGroup { Name = "Handle" },
                    new ItemGroup { Name = "Trim" },
                    new ItemGroup { Name = "Stem" }
                );
                context.SaveChanges();
            }

            // 7. Default Product categories
            if (!context.ProductCategories.Any())
            {
                context.ProductCategories.AddRange(
                    new ProductCategory { Name = "Ball Valve" },
                    new ProductCategory { Name = "Gate Valve" },
                    new ProductCategory { Name = "Globe Valve" },
                    new ProductCategory { Name = "Check Valve" },
                    new ProductCategory { Name = "Butterfly Valve" }
                );
                context.SaveChanges();
            }

            // 8. Process master — system + job-work processes
            if (!context.Processes.Any())
            {
                context.Processes.AddRange(
                    // System (built-in; not deletable)
                    new ProcessMaster { ProcessName = "Purchase Indent", ProcessType = ProcessType.System, SequenceNumber = 10, IsMandatory = true, IsSystem = true },
                    new ProcessMaster { ProcessName = "Purchase Order", ProcessType = ProcessType.System, SequenceNumber = 20, IsMandatory = true, IsSystem = true },
                    new ProcessMaster { ProcessName = "Inward", ProcessType = ProcessType.System, SequenceNumber = 30, IsMandatory = true, IsSystem = true },
                    new ProcessMaster { ProcessName = "Quality Check", ProcessType = ProcessType.System, SequenceNumber = 40, IsMandatory = true, IsSystem = true },
                    new ProcessMaster { ProcessName = "Production", ProcessType = ProcessType.System, SequenceNumber = 90, IsMandatory = true, IsSystem = true },
                    new ProcessMaster { ProcessName = "Delivery", ProcessType = ProcessType.System, SequenceNumber = 100, IsMandatory = true, IsSystem = true },

                    // Job-Work (outsourced; editable)
                    new ProcessMaster { ProcessName = "Machining", ProcessType = ProcessType.JobWork, SequenceNumber = 50 },
                    new ProcessMaster { ProcessName = "Powder Coating", ProcessType = ProcessType.JobWork, SequenceNumber = 60 },
                    new ProcessMaster { ProcessName = "Polishing", ProcessType = ProcessType.JobWork, SequenceNumber = 70 },
                    new ProcessMaster { ProcessName = "Heat Treatment", ProcessType = ProcessType.JobWork, SequenceNumber = 75 },
                    new ProcessMaster { ProcessName = "Threading", ProcessType = ProcessType.JobWork, SequenceNumber = 80 },
                    new ProcessMaster { ProcessName = "Assembly", ProcessType = ProcessType.JobWork, SequenceNumber = 85 }
                );
                context.SaveChanges();
            }

            // 9. Document Control - default applied revision for each printable document type
            if (!context.DocumentControls.Any())
            {
                var today = DateTime.Today;
                context.DocumentControls.AddRange(
                    new DocumentControl { DocumentType = DocumentType.PurchaseIndent, DocumentNo = "AEA/PI/01", RevisionNo = "00", RevisionDate = today, IsApplied = true, IsActive = true },
                    new DocumentControl { DocumentType = DocumentType.PurchaseOrder,  DocumentNo = "AEA/PO/01", RevisionNo = "00", RevisionDate = today, IsApplied = true, IsActive = true },
                    new DocumentControl { DocumentType = DocumentType.JobWork,        DocumentNo = "AEA/JW/01", RevisionNo = "00", RevisionDate = today, IsApplied = true, IsActive = true },
                    new DocumentControl { DocumentType = DocumentType.DeliveryChallan, DocumentNo = "AEA/DC/01", RevisionNo = "00", RevisionDate = today, IsApplied = true, IsActive = true }
                );
                context.SaveChanges();
            }
        }
    }
}
