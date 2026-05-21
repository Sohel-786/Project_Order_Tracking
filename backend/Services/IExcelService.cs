using net_backend.DTOs;

namespace net_backend.Services
{
    public interface IExcelService
    {
        /// <summary>
        /// Reflection-based generic export. Writes property names as headers (camelCase split → Camel Case)
        /// and supports primitive/string/decimal/DateTime/bool/enum values plus auto-filter.
        /// </summary>
        byte[] GenerateExcel(IEnumerable<object> data, string sheetName = "Sheet1", string? titleRow = null);

        /// <summary>
        /// Reflection-based generic import. Reads the first row as headers and maps them to <typeparamref name="T"/> properties.
        /// </summary>
        ImportResultDto<T> ImportExcel<T>(Stream fileStream) where T : new();
    }
}
