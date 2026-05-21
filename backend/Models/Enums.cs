namespace net_backend.Models
{
    public enum Role
    {
        ADMIN,
        MANAGER,
        USER
    }

    /// <summary>Logical type of party stored in the master.</summary>
    public enum PartyType
    {
        Customer = 0,
        Vendor = 1,
        JobWorkVendor = 2
    }

    /// <summary>Classification used to drive workflow for a process master entry.</summary>
    public enum ProcessType
    {
        System = 0,    // Built-in (PI, PO, Inward, QC, Production, Delivery)
        JobWork = 1    // Outsourced (Machining, Powder Coating, Polishing, Heat Treatment, Threading, Assembly)
    }

    public enum BomStatus
    {
        Draft = 0,
        Active = 1,
        Inactive = 2
    }

    public enum OrderStatus
    {
        Pending = 0,
        InProcurement = 1,
        InProduction = 2,
        PartiallyDelivered = 3,
        FullyDelivered = 4,
        Cancelled = 9
    }

    public enum PurchaseIndentType
    {
        New = 0,
        Repair = 1,
        Correction = 2,
        Modification = 3
    }

    public enum PurchaseIndentStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2
    }

    /// <summary>Purpose of a Purchase Indent: feeds Purchase Order vs Job Work.</summary>
    public enum PurchaseIndentFor
    {
        PurchaseOrder = 0,
        JobWork = 1
    }

    public enum PurchaseIndentPriority
    {
        Normal = 0,
        Urgent = 1,
        Critical = 2
    }

    public enum PoStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2
    }

    /// <summary>Indian GST modes used in PO calculations.</summary>
    public enum GstType
    {
        CGST_SGST = 0,
        IGST = 1,
        UGST = 2
    }

    /// <summary>Source of an inward document line: from a Purchase Order or a Job Work.</summary>
    public enum InwardSourceType
    {
        PO = 0,
        JobWork = 1
    }

    public enum InwardStatus
    {
        Draft = 0,
        Submitted = 1
    }

    public enum JobWorkStatus
    {
        Pending = 0,
        InTransit = 1,
        Completed = 2
    }

    public enum QcStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2
    }

    /// <summary>Per-quantity decision applied to a single QC item line.</summary>
    public enum QcItemDecision
    {
        Pending = 0,
        Approved = 1,
        Rework = 2,
        Rejected = 3
    }

    public enum ProductionStatus
    {
        Draft = 0,
        Confirmed = 1
    }

    public enum DeliveryStatus
    {
        Draft = 0,
        Dispatched = 1
    }

    /// <summary>Lifecycle stage for a single BOM item unit (one unit per row × quantity).</summary>
    public enum BomItemUnitStatus
    {
        Planned = 0,
        InPI = 1,
        InPO = 2,
        InwardDone = 3,
        InQC = 4,
        InJobWork = 5,
        Ready = 6,
        Consumed = 7
    }

    /// <summary>Document types used for Document Control (print revisions).</summary>
    public enum DocumentType
    {
        PurchaseIndent = 0,
        PurchaseOrder = 1,
        JobWork = 2,
        DeliveryChallan = 3
    }
}
