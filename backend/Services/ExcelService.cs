using ClosedXML.Excel;
using net_backend.DTOs;
using System.Reflection;

namespace net_backend.Services
{
    public class ExcelService : IExcelService
    {
        private const string ExcelDateTimeFormat = "dd/mm/yyyy, hh:mm AM/PM";

        public byte[] GenerateExcel(IEnumerable<object> data, string sheetName = "Sheet1", string? titleRow = null)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add(sheetName);
            var rowIdx = 1;

            if (!string.IsNullOrEmpty(titleRow))
            {
                worksheet.Cell(rowIdx, 1).Value = titleRow;
                worksheet.Cell(rowIdx, 1).Style.Font.Bold = true;
                worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 14;
                rowIdx++;
            }

            var items = (data ?? Array.Empty<object>()).Where(x => x != null).ToList();
            if (items.Count == 0)
            {
                using var emptyStream = new MemoryStream();
                workbook.SaveAs(emptyStream);
                return emptyStream.ToArray();
            }

            var properties = items[0].GetType().GetProperties()
                .Where(p =>
                    p.PropertyType.IsPrimitive ||
                    p.PropertyType == typeof(string) ||
                    p.PropertyType == typeof(decimal) || p.PropertyType == typeof(decimal?) ||
                    p.PropertyType == typeof(double)  || p.PropertyType == typeof(double?)  ||
                    p.PropertyType == typeof(DateTime)|| p.PropertyType == typeof(DateTime?) ||
                    p.PropertyType == typeof(int)     || p.PropertyType == typeof(int?)     ||
                    p.PropertyType == typeof(long)    || p.PropertyType == typeof(long?)    ||
                    p.PropertyType == typeof(bool)    || p.PropertyType == typeof(bool?)    ||
                    p.PropertyType.IsEnum)
                .ToList();

            // Headers
            for (int i = 0; i < properties.Count; i++)
            {
                var cell = worksheet.Cell(rowIdx, i + 1);
                cell.Value = SplitCamelCase(properties[i].Name);
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F3F4F6");
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            }
            var headerRow = rowIdx;
            rowIdx++;

            foreach (var item in items)
            {
                for (int i = 0; i < properties.Count; i++)
                {
                    var value = properties[i].GetValue(item);
                    var cell = worksheet.Cell(rowIdx, i + 1);
                    if (value == null)              cell.Value = "";
                    else if (value is string s)     cell.Value = s;
                    else if (value is bool b)       cell.Value = b;
                    else if (value is int iVal)     cell.Value = iVal;
                    else if (value is long lVal)    cell.Value = lVal;
                    else if (value is decimal d)    cell.Value = (double)d;
                    else if (value is double db)    cell.Value = db;
                    else if (value is DateTime dt)  { cell.Value = dt; cell.Style.DateFormat.Format = ExcelDateTimeFormat; }
                    else                            cell.Value = value.ToString();
                }
                rowIdx++;
            }

            worksheet.Columns().AdjustToContents();
            worksheet.Range(headerRow, 1, rowIdx - 1, properties.Count).SetAutoFilter();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        public ImportResultDto<T> ImportExcel<T>(Stream fileStream) where T : new()
        {
            var result = new ImportResultDto<T>();
            using var workbook = new XLWorkbook(fileStream);
            var worksheet = workbook.Worksheets.FirstOrDefault();
            if (worksheet == null) return result;

            var firstRow = worksheet.FirstRowUsed();
            var lastRow  = worksheet.LastRowUsed();
            if (firstRow == null || lastRow == null) return result;

            var headers = firstRow.CellsUsed().Select(c => (c.GetValue<string>() ?? string.Empty).Trim()).ToList();
            var properties = typeof(T).GetProperties().Where(p => p.CanWrite).ToList();

            var headerMap = new Dictionary<int, PropertyInfo>();
            for (int i = 0; i < headers.Count; i++)
            {
                var headerNormalised = NormalizeHeader(headers[i]);
                var match = properties.FirstOrDefault(p => NormalizeHeader(SplitCamelCase(p.Name)) == headerNormalised
                                                        || NormalizeHeader(p.Name) == headerNormalised);
                if (match != null) headerMap[i + 1] = match;
            }

            var rowIdx = firstRow.RowNumber() + 1;
            result.TotalRows = Math.Max(0, lastRow.RowNumber() - firstRow.RowNumber());

            for (int r = rowIdx; r <= lastRow.RowNumber(); r++)
            {
                var row = worksheet.Row(r);
                if (row.IsEmpty()) continue;

                var entity = new T();
                try
                {
                    foreach (var kvp in headerMap)
                    {
                        var cellVal = row.Cell(kvp.Key).Value;
                        var prop = kvp.Value;
                        var target = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
                        object? converted;
                        if (cellVal.IsBlank) { converted = null; }
                        else if (target == typeof(string))   { converted = cellVal.GetText()?.Trim(); }
                        else if (target == typeof(int))      { converted = (int)cellVal.GetNumber(); }
                        else if (target == typeof(long))     { converted = (long)cellVal.GetNumber(); }
                        else if (target == typeof(decimal))  { converted = (decimal)cellVal.GetNumber(); }
                        else if (target == typeof(double))   { converted = cellVal.GetNumber(); }
                        else if (target == typeof(bool))     { converted = ParseBool(cellVal.ToString()); }
                        else if (target == typeof(DateTime)) { converted = cellVal.GetDateTime(); }
                        else                                  { converted = Convert.ChangeType(cellVal.ToString(), target); }
                        prop.SetValue(entity, converted);
                    }
                    result.Data.Add(new ExcelRow<T> { RowNumber = r, Data = entity });
                }
                catch (Exception ex)
                {
                    result.Errors.Add(new RowError { Row = r, Message = ex.Message });
                }
            }

            result.Imported = result.Data.Count;
            return result;
        }

        private static string SplitCamelCase(string s) =>
            System.Text.RegularExpressions.Regex.Replace(s, "(?<!^)([A-Z])", " $1");

        private static string NormalizeHeader(string header) =>
            System.Text.RegularExpressions.Regex.Replace((header ?? string.Empty).ToLowerInvariant(), "[^a-z0-9]", string.Empty);

        private static bool ParseBool(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return false;
            s = s.Trim().ToLowerInvariant();
            return s is "true" or "yes" or "y" or "1" or "active";
        }
    }
}
