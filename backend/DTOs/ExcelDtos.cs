namespace net_backend.DTOs
{
    public class ItemImportDto
    {
        public string ItemName { get; set; } = string.Empty;
        public string? ItemCategory { get; set; }
        public string? ItemType { get; set; }
        public string? ItemGroup { get; set; }
        public string? Material { get; set; }
        public string? Unit { get; set; }
        public string? DrawingNumber { get; set; }
        public string? RevisionNumber { get; set; }
        public string? Description { get; set; }
        public string? IsActive { get; set; }
    }

    public class ProductImportDto
    {
        public string ProductName { get; set; } = string.Empty;
        public string? ProductCategory { get; set; }
        public string? Unit { get; set; }
        public string? DrawingNumber { get; set; }
        public string? RevisionNumber { get; set; }
        public string? Description { get; set; }
        public string? StandardBomAvailable { get; set; }
        public string? IsActive { get; set; }
    }

    public class PartyImportDto
    {
        public string PartyName { get; set; } = string.Empty;
        public string? PartyType { get; set; }
        public string? ContactPerson { get; set; }
        public string? MobileNumber { get; set; }
        public string? Email { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
        public string? Address { get; set; }
    }

    public class MasterImportDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Symbol { get; set; }
    }

    public class RowError
    {
        public int Row { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class ExcelRow<T> where T : new()
    {
        public int RowNumber { get; set; }
        public T Data { get; set; } = new T();
    }

    public class ValidationEntry<T> where T : new()
    {
        public int Row { get; set; }
        public T Data { get; set; } = new T();
        public string? Message { get; set; }
    }

    public class ValidationResultDto<T> where T : new()
    {
        public List<ValidationEntry<T>> Valid { get; set; } = new();
        public List<ValidationEntry<T>> Duplicates { get; set; } = new();
        public List<ValidationEntry<T>> AlreadyExists { get; set; } = new();
        public List<ValidationEntry<T>> Invalid { get; set; } = new();
        public int TotalRows { get; set; }
    }

    public class ImportResultDto<T> where T : new()
    {
        public int Imported { get; set; }
        public int TotalRows { get; set; }
        public List<RowError> Errors { get; set; } = new();
        public List<ExcelRow<T>> Data { get; set; } = new();
    }
}
