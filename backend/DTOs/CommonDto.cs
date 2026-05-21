namespace net_backend.DTOs
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public T? Data { get; set; }
        public string? Message { get; set; }
        /// <summary>When set, indicates server-side pagination total record count.</summary>
        public int? TotalCount { get; set; }
    }

    /// <summary>Generic partial-update request for single-name sub-masters.</summary>
    public class UpdateMasterRequest
    {
        public string? Name { get; set; }
        public string? Symbol { get; set; }
        public bool IsActive { get; set; }
    }
}
