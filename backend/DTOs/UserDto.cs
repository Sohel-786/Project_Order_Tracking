namespace net_backend.DTOs
{
    public class CreateUserRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Role { get; set; } = "USER";
        public bool IsActive { get; set; } = true;
        public string? Avatar { get; set; }
        public string? MobileNumber { get; set; }
        public string? Email { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? Username { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Role { get; set; }
        public bool? IsActive { get; set; }
        public string? Password { get; set; }
        public string? Avatar { get; set; }
        public string? MobileNumber { get; set; }
        public string? Email { get; set; }
    }
}
