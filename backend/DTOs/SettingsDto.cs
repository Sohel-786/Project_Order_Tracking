using net_backend.Models;

namespace net_backend.DTOs
{
    public class UpdateSettingsRequest
    {
        public string? CompanyName { get; set; }
        public string? SoftwareName { get; set; }
        public string? PrimaryColor { get; set; }
        public string? Address { get; set; }
        public string? GstNo { get; set; }
        public string? ContactNumber { get; set; }
        public string? Email { get; set; }
    }

    public class UpdateUserPermissionsRequest
    {
        public UserPermission? Permissions { get; set; }
    }

    public class DocumentControlDto
    {
        public int Id { get; set; }
        public DocumentType DocumentType { get; set; }
        public string DocumentNo { get; set; } = string.Empty;
        public string RevisionNo { get; set; } = string.Empty;
        public DateTime RevisionDate { get; set; }
        public bool IsApplied { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateDocumentControlDto
    {
        public DocumentType DocumentType { get; set; }
        public string DocumentNo { get; set; } = string.Empty;
        public string RevisionNo { get; set; } = string.Empty;
        public DateTime RevisionDate { get; set; }
    }

    public class UpdateDocumentControlDto
    {
        public string DocumentNo { get; set; } = string.Empty;
        public string RevisionNo { get; set; } = string.Empty;
        public DateTime RevisionDate { get; set; }
    }
}
