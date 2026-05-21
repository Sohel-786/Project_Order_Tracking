using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace net_backend.Models
{
    // ═══════════════════════════════════════════════════════════════════════════
    // SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("code_sequences")]
    public class CodeSequence
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string Key { get; set; } = string.Empty; // e.g. ITEM, PRODUCT, ORDER, PI, PO, JW, INW, QC, PROD, DC
        public long NextNumber { get; set; } = 1;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    /// <summary>Single-row branding/profile settings for the application.</summary>
    [Table("app_settings")]
    public class AppSettings
    {
        public int Id { get; set; }
        [MaxLength(255)]
        public string? CompanyName { get; set; }
        [MaxLength(255)]
        public string? SoftwareName { get; set; }
        [MaxLength(20)]
        public string? PrimaryColor { get; set; }
        public string? LogoUrl { get; set; }
        [MaxLength(500)]
        public string? Address { get; set; }
        [MaxLength(50)]
        public string? GstNo { get; set; }
        [MaxLength(50)]
        public string? ContactNumber { get; set; }
        [MaxLength(255)]
        public string? Email { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    /// <summary>Document metadata for print formats (revisions). One revision can be Applied per DocumentType.</summary>
    [Table("document_controls")]
    public class DocumentControl
    {
        public int Id { get; set; }
        public DocumentType DocumentType { get; set; }
        [Required]
        [MaxLength(50)]
        public string DocumentNo { get; set; } = string.Empty;
        [Required]
        [MaxLength(20)]
        public string RevisionNo { get; set; } = string.Empty;
        public DateTime RevisionDate { get; set; }
        public bool IsApplied { get; set; }
        public bool IsActive { get; set; } = true;
    }

    [Table("audit_logs")]
    public class AuditLog
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        [Required]
        public string Action { get; set; } = string.Empty;
        [Required]
        public string EntityType { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? IpAddress { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USERS / AUTH
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("users")]
    public class User
    {
        public int Id { get; set; }
        [Required]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
        public string? EncryptedPassword { get; set; }
        [NotMapped]
        public string? DecryptedPassword { get; set; }
        [Required]
        public string FirstName { get; set; } = string.Empty;
        [Required]
        public string LastName { get; set; } = string.Empty;
        public Role Role { get; set; } = Role.USER;
        public bool IsActive { get; set; } = true;
        public string? Avatar { get; set; }
        public string? MobileNumber { get; set; }
        public string? Email { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public virtual UserPermission? Permission { get; set; }
        public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    }

    [Table("user_permissions")]
    public class UserPermission
    {
        public int Id { get; set; }
        public int UserId { get; set; }

        // Dashboard
        public bool ViewDashboard { get; set; } = true;
        public bool ExportDashboard { get; set; } = false;

        // Master
        public bool ViewMaster { get; set; } = false;
        public bool AddMaster { get; set; } = false;
        public bool EditMaster { get; set; } = false;
        public bool ImportMaster { get; set; } = false;
        public bool ExportMaster { get; set; } = false;

        public bool ManageParty { get; set; } = false;
        public bool ManageProduct { get; set; } = false;
        public bool ManageItem { get; set; } = false;
        public bool ManageProcess { get; set; } = false;
        public bool ManageBom { get; set; } = false;

        // Sub-masters
        public bool ManageItemType { get; set; } = false;
        public bool ManageItemCategory { get; set; } = false;
        public bool ManageItemGroup { get; set; } = false;
        public bool ManageProductCategory { get; set; } = false;
        public bool ManageMaterial { get; set; } = false;
        public bool ManageUnit { get; set; } = false;

        // Orders
        public bool ViewOrder { get; set; } = false;
        public bool CreateOrder { get; set; } = false;
        public bool EditOrder { get; set; } = false;
        public bool ApproveOrder { get; set; } = false;

        // Purchase Indent
        public bool ViewPI { get; set; } = false;
        public bool CreatePI { get; set; } = false;
        public bool EditPI { get; set; } = false;
        public bool ApprovePI { get; set; } = false;

        // Purchase Order
        public bool ViewPO { get; set; } = false;
        public bool CreatePO { get; set; } = false;
        public bool EditPO { get; set; } = false;
        public bool ApprovePO { get; set; } = false;

        // Inward
        public bool ViewInward { get; set; } = false;
        public bool CreateInward { get; set; } = false;
        public bool EditInward { get; set; } = false;

        // Quality Control
        public bool ViewQC { get; set; } = false;
        public bool CreateQC { get; set; } = false;
        public bool EditQC { get; set; } = false;
        public bool ApproveQC { get; set; } = false;

        // Job Work
        public bool ViewJobWork { get; set; } = false;
        public bool CreateJobWork { get; set; } = false;
        public bool EditJobWork { get; set; } = false;

        // Production
        public bool ViewProduction { get; set; } = false;
        public bool CreateProduction { get; set; } = false;
        public bool EditProduction { get; set; } = false;

        // Delivery
        public bool ViewDelivery { get; set; } = false;
        public bool CreateDelivery { get; set; } = false;
        public bool EditDelivery { get; set; } = false;

        // Reports & Traceability
        public bool ViewReports { get; set; } = false;
        public bool ViewTraceability { get; set; } = false;

        // Settings
        public bool AccessSettings { get; set; } = false;
        public bool ManageUsers { get; set; } = false;
        public bool ManageDocumentControl { get; set; } = false;

        // UI Preferences
        [MaxLength(20)]
        public string NavigationLayout { get; set; } = "SIDEBAR"; // SIDEBAR | HORIZONTAL

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PARTY MASTER  (Customers / Vendors / Job Work Vendors)
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("parties")]
    public class Party
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(200)]
        public string PartyName { get; set; } = string.Empty;
        public PartyType PartyType { get; set; } = PartyType.Vendor;

        [MaxLength(150)]
        public string? ContactPerson { get; set; }
        [MaxLength(30)]
        public string? MobileNumber { get; set; }
        [MaxLength(255)]
        public string? Email { get; set; }
        [MaxLength(50)]
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
        public string? Address { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SUB-MASTERS (single-name lookups)
    // ═══════════════════════════════════════════════════════════════════════════

    public abstract class NamedMaster
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    [Table("item_types")]
    public class ItemType : NamedMaster { }

    [Table("item_categories")]
    public class ItemCategory : NamedMaster { }

    [Table("item_groups")]
    public class ItemGroup : NamedMaster { }

    [Table("product_categories")]
    public class ProductCategory : NamedMaster { }

    [Table("materials")]
    public class Material : NamedMaster { }

    [Table("units")]
    public class Unit : NamedMaster
    {
        [MaxLength(20)]
        public string? Symbol { get; set; } // e.g. NOS, KG, MTR
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRODUCT MASTER (finished valve products)
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("products")]
    public class Product
    {
        public int Id { get; set; }

        [MaxLength(30)]
        public string ProductCode { get; set; } = string.Empty; // Auto generated, e.g. PRD-00000001

        [Required]
        [MaxLength(250)]
        public string ProductName { get; set; } = string.Empty;

        public int? ProductCategoryId { get; set; }
        public int? UnitId { get; set; }

        [MaxLength(100)]
        public string? DrawingNumber { get; set; }
        [MaxLength(50)]
        public string? RevisionNumber { get; set; }
        public string? DrawingFileUrl { get; set; }

        /// <summary>True if a Standard BOM is/should be available for this product.</summary>
        public bool StandardBomAvailable { get; set; } = true;

        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public int? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("ProductCategoryId")]
        public virtual ProductCategory? ProductCategory { get; set; }
        [ForeignKey("UnitId")]
        public virtual Unit? Unit { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ITEM MASTER (raw materials / components)
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("items")]
    public class Item
    {
        public int Id { get; set; }

        [MaxLength(30)]
        public string ItemCode { get; set; } = string.Empty; // Auto-generated, e.g. ITM-00000001

        [Required]
        [MaxLength(250)]
        public string ItemName { get; set; } = string.Empty;

        public int? ItemCategoryId { get; set; }
        public int? ItemTypeId { get; set; }
        public int? ItemGroupId { get; set; }
        public int? MaterialId { get; set; }
        public int? UnitId { get; set; }

        [MaxLength(100)]
        public string? DrawingNumber { get; set; }
        [MaxLength(50)]
        public string? RevisionNumber { get; set; }
        public string? DrawingFileUrl { get; set; }

        /// <summary>If true the item carries a periodic validation requirement (UI flag only — workflow handled later).</summary>
        public bool ValidationRequired { get; set; } = false;

        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        public int? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("ItemCategoryId")]
        public virtual ItemCategory? ItemCategory { get; set; }
        [ForeignKey("ItemTypeId")]
        public virtual ItemType? ItemType { get; set; }
        [ForeignKey("ItemGroupId")]
        public virtual ItemGroup? ItemGroup { get; set; }
        [ForeignKey("MaterialId")]
        public virtual Material? Material { get; set; }
        [ForeignKey("UnitId")]
        public virtual Unit? Unit { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROCESS MASTER
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("processes")]
    public class ProcessMaster
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string ProcessName { get; set; } = string.Empty;

        public ProcessType ProcessType { get; set; } = ProcessType.JobWork;

        /// <summary>Default sequence for sorting / suggested BOM order.</summary>
        public int SequenceNumber { get; set; } = 0;

        /// <summary>If true, this process is mandatory in default BOM flows.</summary>
        public bool IsMandatory { get; set; } = false;

        /// <summary>System processes (PI, PO, Inward, QC, Production, Delivery) cannot be deleted/edited via UI.</summary>
        public bool IsSystem { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BOM MASTER
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("boms")]
    public class Bom
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        [MaxLength(50)]
        public string BomVersion { get; set; } = "v1";
        public BomStatus Status { get; set; } = BomStatus.Active;
        public string? Remarks { get; set; }

        public bool IsActive { get; set; } = true;
        public int? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("ProductId")]
        public virtual Product? Product { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }

        [JsonIgnore]
        public virtual ICollection<BomItem> Items { get; set; } = new List<BomItem>();
    }

    [Table("bom_items")]
    public class BomItem
    {
        public int Id { get; set; }
        public int BomId { get; set; }
        public int ItemId { get; set; }

        /// <summary>Quantity of this raw item required per 1 unit of the finished Product.</summary>
        public decimal QuantityPerProduct { get; set; } = 1m;
        public int? UnitId { get; set; }
        public int Sequence { get; set; } = 0;
        public string? Remarks { get; set; }

        [ForeignKey("BomId")]
        [JsonIgnore]
        public virtual Bom? Bom { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
        [ForeignKey("UnitId")]
        public virtual Unit? Unit { get; set; }

        public virtual ICollection<BomItemProcess> ProcessFlow { get; set; } = new List<BomItemProcess>();
    }

    /// <summary>Ordered list of processes a BOM item must go through (e.g. PI → PO → Inward → QC → Machining → Polishing → Ready).</summary>
    [Table("bom_item_processes")]
    public class BomItemProcess
    {
        public int Id { get; set; }
        public int BomItemId { get; set; }
        public int ProcessId { get; set; }
        public int Sequence { get; set; } = 0;

        [ForeignKey("BomItemId")]
        [JsonIgnore]
        public virtual BomItem? BomItem { get; set; }
        [ForeignKey("ProcessId")]
        public virtual ProcessMaster? Process { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SALES ORDER
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("orders")]
    public class Order
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string OrderNumber { get; set; } = string.Empty; // Auto, e.g. ORD-00000001
        public DateTime OrderDate { get; set; } = DateTime.Now;

        public int CustomerId { get; set; } // Party with PartyType.Customer
        public DateTime? RequiredDeliveryDate { get; set; }
        public string? Notes { get; set; }
        public OrderStatus Status { get; set; } = OrderStatus.Pending;

        public bool IsActive { get; set; } = true;
        public int? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("CustomerId")]
        public virtual Party? Customer { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }

        [JsonIgnore]
        public virtual ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    }

    [Table("order_items")]
    public class OrderItem
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public int ProductId { get; set; }

        /// <summary>Number of finished products ordered.</summary>
        public int QuantityOrdered { get; set; } = 1;

        /// <summary>Selected BOM (existing or newly created) used to plan procurement & production.</summary>
        public int? BomId { get; set; }

        /// <summary>Number of finished products produced so far against this line.</summary>
        public int ProducedQty { get; set; } = 0;
        /// <summary>Number of finished products dispatched so far against this line.</summary>
        public int DeliveredQty { get; set; } = 0;

        public string? Remarks { get; set; }

        // Snapshots for traceability (preserved against later product/BOM rename)
        [MaxLength(30)]
        public string? ProductCodeSnapshot { get; set; }
        [MaxLength(250)]
        public string? ProductNameSnapshot { get; set; }

        [ForeignKey("OrderId")]
        [JsonIgnore]
        public virtual Order? Order { get; set; }
        [ForeignKey("ProductId")]
        public virtual Product? Product { get; set; }
        [ForeignKey("BomId")]
        public virtual Bom? Bom { get; set; }

        [JsonIgnore]
        public virtual ICollection<OrderBomItemPlan> BomPlan { get; set; } = new List<OrderBomItemPlan>();
    }

    /// <summary>
    /// One row per BOM item of the selected BOM, materialised at the time the order's BOM is chosen.
    /// Snapshot of the planned quantity per order line, plus aggregated execution counters used by Gantt/traceability.
    /// </summary>
    [Table("order_bom_item_plans")]
    public class OrderBomItemPlan
    {
        public int Id { get; set; }
        public int OrderItemId { get; set; }
        public int BomItemId { get; set; }
        public int ItemId { get; set; }

        /// <summary>Total required quantity for this BOM item across the order line (= OrderItem.QuantityOrdered × BomItem.QuantityPerProduct).</summary>
        public decimal RequiredQuantity { get; set; }
        public int? UnitId { get; set; }
        public int Sequence { get; set; } = 0;

        // Snapshots
        [MaxLength(250)]
        public string? ItemNameSnapshot { get; set; }
        [MaxLength(30)]
        public string? ItemCodeSnapshot { get; set; }

        // Aggregated counters (running totals; kept fresh by controllers in same transaction as the underlying line action)
        public decimal IndentedQty { get; set; } = 0;
        public decimal OrderedQty { get; set; } = 0;
        public decimal InwardedQty { get; set; } = 0;
        public decimal QcApprovedQty { get; set; } = 0;
        public decimal QcReworkQty { get; set; } = 0;
        public decimal QcRejectedQty { get; set; } = 0;
        public decimal JobWorkSentQty { get; set; } = 0;
        public decimal ReadyQty { get; set; } = 0;
        public decimal ConsumedQty { get; set; } = 0;

        public DateTime? FirstActivityAt { get; set; }
        public DateTime? LastActivityAt { get; set; }

        [ForeignKey("OrderItemId")]
        [JsonIgnore]
        public virtual OrderItem? OrderItem { get; set; }
        [ForeignKey("BomItemId")]
        public virtual BomItem? BomItem { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
        [ForeignKey("UnitId")]
        public virtual Unit? Unit { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PURCHASE INDENT
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("purchase_indents")]
    public class PurchaseIndent
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string PiNo { get; set; } = string.Empty;

        public PurchaseIndentFor IndentFor { get; set; } = PurchaseIndentFor.PurchaseOrder;
        public PurchaseIndentType Type { get; set; } = PurchaseIndentType.New;
        public PurchaseIndentPriority Priority { get; set; } = PurchaseIndentPriority.Normal;
        public PurchaseIndentStatus Status { get; set; } = PurchaseIndentStatus.Pending;

        public string? Remarks { get; set; }
        public DateTime? ReqDateOfDelivery { get; set; }
        public bool MtcReq { get; set; }

        // Document control snapshot at approval time
        [MaxLength(50)]
        public string? DocumentNo { get; set; }
        [MaxLength(20)]
        public string? RevisionNo { get; set; }
        public DateTime? RevisionDate { get; set; }

        public int CreatedBy { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        [ForeignKey("ApprovedBy")]
        public virtual User? Approver { get; set; }

        public virtual ICollection<PurchaseIndentItem> Items { get; set; } = new List<PurchaseIndentItem>();
    }

    [Table("purchase_indent_items")]
    public class PurchaseIndentItem
    {
        public int Id { get; set; }
        public int PurchaseIndentId { get; set; }

        /// <summary>OrderItem this indent line is for (single line per order item per PI to keep traceability clear).</summary>
        public int? OrderItemId { get; set; }
        /// <summary>Specific BOM-item plan row this indent line consumes against.</summary>
        public int? OrderBomItemPlanId { get; set; }

        public int ItemId { get; set; }
        /// <summary>Quantity requested in this PI line.</summary>
        public decimal Quantity { get; set; } = 1m;
        public int? UnitId { get; set; }
        public string? Remarks { get; set; }

        // Snapshots
        [MaxLength(250)]
        public string? ItemNameSnapshot { get; set; }
        [MaxLength(30)]
        public string? ItemCodeSnapshot { get; set; }
        [MaxLength(100)]
        public string? DrawingNoSnapshot { get; set; }
        [MaxLength(50)]
        public string? RevisionNoSnapshot { get; set; }

        // Order traceability snapshots
        [MaxLength(50)]
        public string? OrderNumberSnapshot { get; set; }
        [MaxLength(250)]
        public string? ProductNameSnapshot { get; set; }

        [ForeignKey("PurchaseIndentId")]
        [JsonIgnore]
        public virtual PurchaseIndent? PurchaseIndent { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
        [ForeignKey("OrderItemId")]
        public virtual OrderItem? OrderItem { get; set; }
        [ForeignKey("OrderBomItemPlanId")]
        public virtual OrderBomItemPlan? OrderBomItemPlan { get; set; }
        [ForeignKey("UnitId")]
        public virtual Unit? Unit { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PURCHASE ORDER
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("purchase_orders")]
    public class PurchaseOrder
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string PoNo { get; set; } = string.Empty;

        public int VendorId { get; set; } // Party with PartyType.Vendor
        public DateTime? DeliveryDate { get; set; }
        [MaxLength(100)]
        public string? QuotationNo { get; set; }
        public string? QuotationUrlsJson { get; set; }

        public GstType? GstType { get; set; }
        public decimal? GstPercent { get; set; }
        [MaxLength(30)]
        public string? PurchaseType { get; set; } = "Regular";

        public PoStatus Status { get; set; } = PoStatus.Pending;
        public string? Remarks { get; set; }

        // Document control snapshot
        [MaxLength(50)]
        public string? DocumentNo { get; set; }
        [MaxLength(20)]
        public string? RevisionNo { get; set; }
        public DateTime? RevisionDate { get; set; }

        public int CreatedBy { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("VendorId")]
        public virtual Party? Vendor { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        [ForeignKey("ApprovedBy")]
        public virtual User? Approver { get; set; }

        public virtual ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
    }

    [Table("purchase_order_items")]
    public class PurchaseOrderItem
    {
        public int Id { get; set; }
        public int PurchaseOrderId { get; set; }
        public int PurchaseIndentItemId { get; set; }

        /// <summary>Quantity ordered on this PO line. Must be ≤ remaining PI line quantity.</summary>
        public decimal Quantity { get; set; } = 1m;
        public decimal Rate { get; set; }

        // Snapshots (denormalised from PI item at PO create time)
        [MaxLength(250)]
        public string? ItemNameSnapshot { get; set; }
        [MaxLength(30)]
        public string? ItemCodeSnapshot { get; set; }
        [MaxLength(50)]
        public string? OrderNumberSnapshot { get; set; }
        [MaxLength(250)]
        public string? ProductNameSnapshot { get; set; }

        [ForeignKey("PurchaseOrderId")]
        [JsonIgnore]
        public virtual PurchaseOrder? PurchaseOrder { get; set; }
        [ForeignKey("PurchaseIndentItemId")]
        public virtual PurchaseIndentItem? PurchaseIndentItem { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // JOB WORK
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("job_works")]
    public class JobWork
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string JobWorkNo { get; set; } = string.Empty;

        public int ToPartyId { get; set; } // Party with PartyType.JobWorkVendor (or Vendor accepted)
        public DateTime OutwardDate { get; set; } = DateTime.Now;
        public DateTime? ExpectedReturnDate { get; set; }
        public DateTime? InwardDate { get; set; }

        public int? ProcessId { get; set; } // ProcessMaster (e.g. Machining)
        public string? Description { get; set; }
        public string? Remarks { get; set; }
        public JobWorkStatus Status { get; set; } = JobWorkStatus.Pending;
        public string? AttachmentUrlsJson { get; set; }

        // Document control snapshot
        [MaxLength(50)]
        public string? DocumentNo { get; set; }
        [MaxLength(20)]
        public string? RevisionNo { get; set; }
        public DateTime? RevisionDate { get; set; }

        public int CreatedBy { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("ToPartyId")]
        public virtual Party? ToParty { get; set; }
        [ForeignKey("ProcessId")]
        public virtual ProcessMaster? Process { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }

        public virtual ICollection<JobWorkItem> Items { get; set; } = new List<JobWorkItem>();
    }

    [Table("job_work_items")]
    public class JobWorkItem
    {
        public int Id { get; set; }
        public int JobWorkId { get; set; }

        /// <summary>Origin PI item — Job Work flows only from an approved JobWork-purpose PI.</summary>
        public int? PurchaseIndentItemId { get; set; }

        public int ItemId { get; set; }
        public decimal Quantity { get; set; } = 1m;
        public decimal? Rate { get; set; }
        public decimal? GstPercent { get; set; }
        public string? Remarks { get; set; }

        // Snapshots
        [MaxLength(250)]
        public string? ItemNameSnapshot { get; set; }
        [MaxLength(30)]
        public string? ItemCodeSnapshot { get; set; }
        [MaxLength(50)]
        public string? OrderNumberSnapshot { get; set; }
        [MaxLength(250)]
        public string? ProductNameSnapshot { get; set; }

        [ForeignKey("JobWorkId")]
        [JsonIgnore]
        public virtual JobWork? JobWork { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
        [ForeignKey("PurchaseIndentItemId")]
        public virtual PurchaseIndentItem? PurchaseIndentItem { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INWARD (Goods Receipt)
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("inwards")]
    public class Inward
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string InwardNo { get; set; } = string.Empty;
        [MaxLength(100)]
        public string? GrnNumber { get; set; }
        public DateTime InwardDate { get; set; } = DateTime.Now;

        public int? VendorId { get; set; }
        public string? Remarks { get; set; }
        public InwardStatus Status { get; set; } = InwardStatus.Submitted;
        public string? AttachmentUrlsJson { get; set; }

        public int CreatedBy { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("VendorId")]
        public virtual Party? Vendor { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }

        public virtual ICollection<InwardLine> Lines { get; set; } = new List<InwardLine>();
    }

    [Table("inward_lines")]
    public class InwardLine
    {
        public int Id { get; set; }
        public int InwardId { get; set; }
        public int ItemId { get; set; }

        public InwardSourceType SourceType { get; set; }
        public int? SourceRefId { get; set; } // PurchaseOrderItem.Id (for PO) or JobWorkItem.Id (for JW)

        public decimal Quantity { get; set; } = 1m;
        public int? UnitId { get; set; }
        public decimal? Rate { get; set; }
        public decimal? GstPercent { get; set; }
        public string? Remarks { get; set; }

        public bool IsQCPending { get; set; } = true;
        public bool IsQCApproved { get; set; } = false;

        /// <summary>If this inward line is a rework re-receipt, points to the original inward line.</summary>
        public int? ReworkOfInwardLineId { get; set; }
        public int? ReworkFromQcEntryId { get; set; }

        // Snapshots
        [MaxLength(250)]
        public string? ItemNameSnapshot { get; set; }
        [MaxLength(30)]
        public string? ItemCodeSnapshot { get; set; }
        [MaxLength(100)]
        public string? DrawingNoSnapshot { get; set; }
        [MaxLength(50)]
        public string? RevisionNoSnapshot { get; set; }
        [MaxLength(50)]
        public string? OrderNumberSnapshot { get; set; }
        [MaxLength(250)]
        public string? ProductNameSnapshot { get; set; }

        [ForeignKey("InwardId")]
        [JsonIgnore]
        public virtual Inward? Inward { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
        [ForeignKey("UnitId")]
        public virtual Unit? Unit { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QC
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("qc_entries")]
    public class QualityControlEntry
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string QcNo { get; set; } = string.Empty;

        public int PartyId { get; set; }
        public InwardSourceType SourceType { get; set; }
        public string? Remarks { get; set; }
        public QcStatus Status { get; set; } = QcStatus.Pending;
        public string? AttachmentUrlsJson { get; set; }

        public int CreatedBy { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("PartyId")]
        public virtual Party? Party { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        [ForeignKey("ApprovedBy")]
        public virtual User? Approver { get; set; }

        public virtual ICollection<QualityControlItem> Items { get; set; } = new List<QualityControlItem>();
    }

    [Table("qc_items")]
    public class QualityControlItem
    {
        public int Id { get; set; }
        public int QcEntryId { get; set; }
        public int InwardLineId { get; set; }

        /// <summary>Quantity considered for this row (often equals InwardLine.Quantity but split is allowed for partial decisions).</summary>
        public decimal Quantity { get; set; } = 1m;
        public decimal ApprovedQty { get; set; } = 0m;
        public decimal ReworkQty { get; set; } = 0m;
        public decimal RejectedQty { get; set; } = 0m;

        public QcItemDecision Decision { get; set; } = QcItemDecision.Pending;
        public string? Remarks { get; set; }

        [ForeignKey("QcEntryId")]
        [JsonIgnore]
        public virtual QualityControlEntry? QcEntry { get; set; }
        [ForeignKey("InwardLineId")]
        public virtual InwardLine? InwardLine { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRODUCTION
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("production_entries")]
    public class ProductionEntry
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string ProductionNo { get; set; } = string.Empty;
        public DateTime ProductionDate { get; set; } = DateTime.Now;

        public int OrderId { get; set; }
        public int OrderItemId { get; set; }
        public int ProductId { get; set; }

        public int PlannedQty { get; set; }
        public int ProducedQty { get; set; }

        public ProductionStatus Status { get; set; } = ProductionStatus.Confirmed;
        public string? Remarks { get; set; }

        // Snapshots
        [MaxLength(50)]
        public string? OrderNumberSnapshot { get; set; }
        [MaxLength(250)]
        public string? ProductNameSnapshot { get; set; }
        [MaxLength(30)]
        public string? ProductCodeSnapshot { get; set; }

        public int CreatedBy { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("OrderId")]
        public virtual Order? Order { get; set; }
        [ForeignKey("OrderItemId")]
        public virtual OrderItem? OrderItem { get; set; }
        [ForeignKey("ProductId")]
        public virtual Product? Product { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }

        public virtual ICollection<ProductionConsumption> Consumptions { get; set; } = new List<ProductionConsumption>();
    }

    [Table("production_consumptions")]
    public class ProductionConsumption
    {
        public int Id { get; set; }
        public int ProductionEntryId { get; set; }
        public int OrderBomItemPlanId { get; set; }
        public int ItemId { get; set; }

        public decimal QuantityConsumed { get; set; }
        public string? Remarks { get; set; }

        // Snapshots
        [MaxLength(250)]
        public string? ItemNameSnapshot { get; set; }
        [MaxLength(30)]
        public string? ItemCodeSnapshot { get; set; }

        [ForeignKey("ProductionEntryId")]
        [JsonIgnore]
        public virtual ProductionEntry? ProductionEntry { get; set; }
        [ForeignKey("OrderBomItemPlanId")]
        public virtual OrderBomItemPlan? OrderBomItemPlan { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELIVERY
    // ═══════════════════════════════════════════════════════════════════════════

    [Table("delivery_challans")]
    public class DeliveryChallan
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string ChallanNo { get; set; } = string.Empty;
        public DateTime DispatchDate { get; set; } = DateTime.Now;

        public int OrderId { get; set; }
        public int CustomerId { get; set; }

        [MaxLength(50)]
        public string? VehicleNo { get; set; }
        [MaxLength(150)]
        public string? DriverName { get; set; }
        [MaxLength(30)]
        public string? DriverContact { get; set; }
        public string? Remarks { get; set; }
        public DeliveryStatus Status { get; set; } = DeliveryStatus.Dispatched;
        public string? AttachmentUrlsJson { get; set; }

        // Document control snapshot
        [MaxLength(50)]
        public string? DocumentNo { get; set; }
        [MaxLength(20)]
        public string? RevisionNo { get; set; }
        public DateTime? RevisionDate { get; set; }

        public int CreatedBy { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("OrderId")]
        public virtual Order? Order { get; set; }
        [ForeignKey("CustomerId")]
        public virtual Party? Customer { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }

        public virtual ICollection<DeliveryChallanItem> Items { get; set; } = new List<DeliveryChallanItem>();
    }

    [Table("delivery_challan_items")]
    public class DeliveryChallanItem
    {
        public int Id { get; set; }
        public int DeliveryChallanId { get; set; }
        public int OrderItemId { get; set; }
        public int ProductId { get; set; }

        public int DispatchQuantity { get; set; }
        public string? Remarks { get; set; }

        // Snapshots
        [MaxLength(250)]
        public string? ProductNameSnapshot { get; set; }
        [MaxLength(30)]
        public string? ProductCodeSnapshot { get; set; }

        [ForeignKey("DeliveryChallanId")]
        [JsonIgnore]
        public virtual DeliveryChallan? DeliveryChallan { get; set; }
        [ForeignKey("OrderItemId")]
        public virtual OrderItem? OrderItem { get; set; }
        [ForeignKey("ProductId")]
        public virtual Product? Product { get; set; }
    }
}
