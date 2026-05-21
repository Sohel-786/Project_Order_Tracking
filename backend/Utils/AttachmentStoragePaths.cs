using Microsoft.AspNetCore.Hosting;

namespace net_backend.Utils
{
    public static class AttachmentStoragePaths
    {
        public static string GetWebRootPath(IWebHostEnvironment env)
        {
            // In IIS published scenarios WebRootPath points to the deployed wwwroot.
            return env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        }

        public static string ScopeFolderFromId(int? id, string fallbackPrefix)
        {
            if (id.HasValue && id.Value > 0) return id.Value.ToString();
            return $"{fallbackPrefix}-unknown";
        }

        public static string GetModuleTempDirRel(string companyDir, string locationDir, string divisionDir, string moduleKey)
            => Path.Combine("storage", companyDir, locationDir, divisionDir, moduleKey, "temp", "files");

        public static string GetModuleFinalDirRel(string companyDir, string locationDir, string divisionDir, string moduleKey, string entryKey)
            => Path.Combine("storage", companyDir, locationDir, divisionDir, moduleKey, entryKey, "files");

        public static string UrlFromRelPath(string relPath)
            => "/" + relPath.Replace("\\", "/").TrimStart('/');

        public static string ToPhysicalPath(string webRootPath, string urlOrRelPath)
        {
            var cleaned = (urlOrRelPath ?? string.Empty).Trim();
            cleaned = cleaned.TrimStart('/');
            cleaned = cleaned.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
            return Path.Combine(webRootPath, cleaned);
        }
    }
}

