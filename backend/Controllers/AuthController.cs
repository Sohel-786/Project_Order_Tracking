using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { success = false, message = "Username and password are required" });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
                return Unauthorized(new { success = false, message = "Invalid credentials" });

            if (!user.IsActive)
                return StatusCode(403, new { success = false, message = "User account is inactive" });

            var sessionExpiresUtc = GetSessionExpiresUtc();
            var token = GenerateJwtToken(user, sessionExpiresUtc);

            Response.Cookies.Append("access_token", token, new CookieOptions
            {
                HttpOnly = true,
                Secure = HttpContext.Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = sessionExpiresUtc,
                Path = "/"
            });

            return Ok(new LoginResponse
            {
                Success = true,
                Token = token,
                User = ToDto(user)
            });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("access_token", new CookieOptions { Path = "/" });
            return Ok(new { success = true, message = "Logged out successfully" });
        }

        [Authorize]
        [HttpPost("validate")]
        public async Task<IActionResult> Validate()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                return Unauthorized(new { success = false, message = "Invalid token claims" });

            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
                return Unauthorized(new { success = false, message = "User not found or inactive" });

            return Ok(new
            {
                success = true,
                valid = true,
                user = ToDto(user)
            });
        }

        private static UserDto ToDto(User user) => new()
        {
            Id = user.Id,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role.ToString(),
            Avatar = user.Avatar,
            Email = user.Email,
            MobileNumber = user.MobileNumber,
        };

        private DateTime GetSessionExpiresUtc()
        {
            var hours = _configuration.GetValue("Jwt:SessionLifetimeHours", 8);
            if (hours < 1) hours = 1;
            return DateTime.UtcNow.AddHours(hours);
        }

        private string GenerateJwtToken(User user, DateTime expiresUtc)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Name, user.Username),
                new(ClaimTypes.Role, user.Role.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                _configuration["Jwt:Issuer"],
                _configuration["Jwt:Audience"],
                claims,
                expires: expiresUtc,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
