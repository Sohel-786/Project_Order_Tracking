using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.Models;

namespace net_backend.Services
{
    /// <summary>
    /// Generates document codes via the <c>code_sequences</c> table inside a serializable transaction
    /// so two concurrent requests cannot allocate the same number. All codes are global (no division/company scope).
    /// </summary>
    public interface ICodeGeneratorService
    {
        /// <summary>Reserves and returns the next code for the given <paramref name="type"/>.</summary>
        Task<string> GenerateCodeAsync(string type);
    }

    public class CodeGeneratorService : ICodeGeneratorService
    {
        private readonly ApplicationDbContext _context;

        public CodeGeneratorService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateCodeAsync(string type)
        {
            var spec = ResolveSpec(type);
            if (spec == null)
                return $"{type}-{DateTime.Now:yyyyMM}-{Guid.NewGuid().ToString("N").Substring(0, 4).ToUpperInvariant()}";

            var key = spec.Value.Key;

            // Serializable transaction guards against duplicate allocation under concurrency.
            await using var tx = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == key);

            long allocated;
            if (seq == null)
            {
                allocated = 1;
                _context.CodeSequences.Add(new CodeSequence
                {
                    Key = key,
                    NextNumber = 2,
                    UpdatedAt = DateTime.Now
                });
            }
            else
            {
                allocated = seq.NextNumber;
                seq.NextNumber = allocated + 1;
                seq.UpdatedAt = DateTime.Now;
            }

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return $"{spec.Value.Prefix}{allocated.ToString().PadLeft(spec.Value.PadWidth, '0')}";
        }

        private static (string Key, string Prefix, int PadWidth)? ResolveSpec(string type)
        {
            return type?.ToUpperInvariant() switch
            {
                "ITEM"     => ("ITEM",     "ITM-",  8),
                "PRODUCT"  => ("PRODUCT",  "PRD-",  8),
                "ORDER"    => ("ORDER",    "ORD-",  6),
                "PI"       => ("PI",       "PI-",   4),
                "PO"       => ("PO",       "PO-",   4),
                "INWARD"   => ("INWARD",   "INW-",  4),
                "QC"       => ("QC",       "QC-",   4),
                "JW"       => ("JW",       "JW-",   4),
                "PROD"     => ("PROD",     "PRDN-", 4), // production entry  → PRDN-0001
                "DC"       => ("DC",       "DC-",   4), // delivery challan  → DC-0001
                _ => null,
            };
        }
    }
}
