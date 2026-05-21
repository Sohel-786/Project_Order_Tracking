namespace net_backend.DTOs;

/// <summary>Single row of the order ledger report.</summary>
public class OrderLedgerRowDto
{
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public string? CustomerName { get; set; }
    public string? ProductName { get; set; }
    public string? ProductCode { get; set; }
    public int QuantityOrdered { get; set; }
    public string? ItemName { get; set; }
    public string? ItemCode { get; set; }
    public decimal? RequiredQty { get; set; }

    public string Stage { get; set; } = string.Empty; // PI / PO / Inward / QC / JobWork / Production / Delivery
    public string DocumentNo { get; set; } = string.Empty;
    public DateTime ActivityDate { get; set; }
    public decimal Quantity { get; set; }
    public string? Status { get; set; }
    public string? PartyName { get; set; }
    public string? Remarks { get; set; }
}
