namespace net_backend.DTOs
{
    public class ItemDto
    {
        public int Id { get; set; }
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public int? ItemCategoryId { get; set; }
        public string? ItemCategoryName { get; set; }
        public int? ItemTypeId { get; set; }
        public string? ItemTypeName { get; set; }
        public int? ItemGroupId { get; set; }
        public string? ItemGroupName { get; set; }
        public int? MaterialId { get; set; }
        public string? MaterialName { get; set; }
        public int? UnitId { get; set; }
        public string? UnitName { get; set; }
        public string? UnitSymbol { get; set; }
        public string? DrawingNumber { get; set; }
        public string? RevisionNumber { get; set; }
        public string? DrawingFileUrl { get; set; }
        public bool ValidationRequired { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateItemDto
    {
        public string ItemName { get; set; } = string.Empty;
        public int? ItemCategoryId { get; set; }
        public int? ItemTypeId { get; set; }
        public int? ItemGroupId { get; set; }
        public int? MaterialId { get; set; }
        public int? UnitId { get; set; }
        public string? DrawingNumber { get; set; }
        public string? RevisionNumber { get; set; }
        public string? DrawingFileUrl { get; set; }
        public bool ValidationRequired { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateItemDto : CreateItemDto { }
}
