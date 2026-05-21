using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class InitialCreate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_settings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    SoftwareName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    PrimaryColor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    GstNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ContactNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_settings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "code_sequences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Key = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NextNumber = table.Column<long>(type: "bigint", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_code_sequences", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "document_controls",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DocumentType = table.Column<int>(type: "int", nullable: false),
                    DocumentNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RevisionNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RevisionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsApplied = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_controls", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "item_categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "item_groups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_groups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "item_types",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_types", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "materials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_materials", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "parties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PartyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PartyType = table.Column<int>(type: "int", nullable: false),
                    ContactPerson = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    MobileNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    GstNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    GstDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parties", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "processes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProcessName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ProcessType = table.Column<int>(type: "int", nullable: false),
                    SequenceNumber = table.Column<int>(type: "int", nullable: false),
                    IsMandatory = table.Column<bool>(type: "bit", nullable: false),
                    IsSystem = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_processes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "product_categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "units",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Symbol = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_units", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Username = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Password = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EncryptedPassword = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Avatar = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MobileNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntityId = table.Column<int>(type: "int", nullable: true),
                    OldValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_audit_logs_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "inwards",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InwardNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    GrnNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    InwardDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    VendorId = table.Column<int>(type: "int", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AttachmentUrlsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inwards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_inwards_parties_VendorId",
                        column: x => x.VendorId,
                        principalTable: "parties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_inwards_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ItemCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ItemName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ItemCategoryId = table.Column<int>(type: "int", nullable: true),
                    ItemTypeId = table.Column<int>(type: "int", nullable: true),
                    ItemGroupId = table.Column<int>(type: "int", nullable: true),
                    MaterialId = table.Column<int>(type: "int", nullable: true),
                    UnitId = table.Column<int>(type: "int", nullable: true),
                    DrawingNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RevisionNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DrawingFileUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ValidationRequired = table.Column<bool>(type: "bit", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_items_item_categories_ItemCategoryId",
                        column: x => x.ItemCategoryId,
                        principalTable: "item_categories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_items_item_groups_ItemGroupId",
                        column: x => x.ItemGroupId,
                        principalTable: "item_groups",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_items_item_types_ItemTypeId",
                        column: x => x.ItemTypeId,
                        principalTable: "item_types",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_items_materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "materials",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_items_units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "units",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_items_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "job_works",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobWorkNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ToPartyId = table.Column<int>(type: "int", nullable: false),
                    OutwardDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpectedReturnDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InwardDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProcessId = table.Column<int>(type: "int", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AttachmentUrlsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DocumentNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RevisionNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RevisionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_works", x => x.Id);
                    table.ForeignKey(
                        name: "FK_job_works_parties_ToPartyId",
                        column: x => x.ToPartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_job_works_processes_ProcessId",
                        column: x => x.ProcessId,
                        principalTable: "processes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_job_works_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "orders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OrderDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    RequiredDeliveryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_orders_parties_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_orders_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ProductName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    ProductCategoryId = table.Column<int>(type: "int", nullable: true),
                    UnitId = table.Column<int>(type: "int", nullable: true),
                    DrawingNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RevisionNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DrawingFileUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StandardBomAvailable = table.Column<bool>(type: "bit", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_products_product_categories_ProductCategoryId",
                        column: x => x.ProductCategoryId,
                        principalTable: "product_categories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_products_units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "units",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_products_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "purchase_indents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PiNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IndentFor = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReqDateOfDelivery = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MtcReq = table.Column<bool>(type: "bit", nullable: false),
                    DocumentNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RevisionNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RevisionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_indents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_indents_users_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_purchase_indents_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_orders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PoNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    VendorId = table.Column<int>(type: "int", nullable: false),
                    DeliveryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    QuotationNo = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    QuotationUrlsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GstType = table.Column<int>(type: "int", nullable: true),
                    GstPercent = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PurchaseType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DocumentNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RevisionNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RevisionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_orders_parties_VendorId",
                        column: x => x.VendorId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_orders_users_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_purchase_orders_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "qc_entries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QcNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PartyId = table.Column<int>(type: "int", nullable: false),
                    SourceType = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AttachmentUrlsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qc_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_qc_entries_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_qc_entries_users_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_qc_entries_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_permissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ViewDashboard = table.Column<bool>(type: "bit", nullable: false),
                    ExportDashboard = table.Column<bool>(type: "bit", nullable: false),
                    ViewMaster = table.Column<bool>(type: "bit", nullable: false),
                    AddMaster = table.Column<bool>(type: "bit", nullable: false),
                    EditMaster = table.Column<bool>(type: "bit", nullable: false),
                    ImportMaster = table.Column<bool>(type: "bit", nullable: false),
                    ExportMaster = table.Column<bool>(type: "bit", nullable: false),
                    ManageParty = table.Column<bool>(type: "bit", nullable: false),
                    ManageProduct = table.Column<bool>(type: "bit", nullable: false),
                    ManageItem = table.Column<bool>(type: "bit", nullable: false),
                    ManageProcess = table.Column<bool>(type: "bit", nullable: false),
                    ManageBom = table.Column<bool>(type: "bit", nullable: false),
                    ManageItemType = table.Column<bool>(type: "bit", nullable: false),
                    ManageItemCategory = table.Column<bool>(type: "bit", nullable: false),
                    ManageItemGroup = table.Column<bool>(type: "bit", nullable: false),
                    ManageProductCategory = table.Column<bool>(type: "bit", nullable: false),
                    ManageMaterial = table.Column<bool>(type: "bit", nullable: false),
                    ManageUnit = table.Column<bool>(type: "bit", nullable: false),
                    ViewOrder = table.Column<bool>(type: "bit", nullable: false),
                    CreateOrder = table.Column<bool>(type: "bit", nullable: false),
                    EditOrder = table.Column<bool>(type: "bit", nullable: false),
                    ApproveOrder = table.Column<bool>(type: "bit", nullable: false),
                    ViewPI = table.Column<bool>(type: "bit", nullable: false),
                    CreatePI = table.Column<bool>(type: "bit", nullable: false),
                    EditPI = table.Column<bool>(type: "bit", nullable: false),
                    ApprovePI = table.Column<bool>(type: "bit", nullable: false),
                    ViewPO = table.Column<bool>(type: "bit", nullable: false),
                    CreatePO = table.Column<bool>(type: "bit", nullable: false),
                    EditPO = table.Column<bool>(type: "bit", nullable: false),
                    ApprovePO = table.Column<bool>(type: "bit", nullable: false),
                    ViewInward = table.Column<bool>(type: "bit", nullable: false),
                    CreateInward = table.Column<bool>(type: "bit", nullable: false),
                    EditInward = table.Column<bool>(type: "bit", nullable: false),
                    ViewQC = table.Column<bool>(type: "bit", nullable: false),
                    CreateQC = table.Column<bool>(type: "bit", nullable: false),
                    EditQC = table.Column<bool>(type: "bit", nullable: false),
                    ApproveQC = table.Column<bool>(type: "bit", nullable: false),
                    ViewJobWork = table.Column<bool>(type: "bit", nullable: false),
                    CreateJobWork = table.Column<bool>(type: "bit", nullable: false),
                    EditJobWork = table.Column<bool>(type: "bit", nullable: false),
                    ViewProduction = table.Column<bool>(type: "bit", nullable: false),
                    CreateProduction = table.Column<bool>(type: "bit", nullable: false),
                    EditProduction = table.Column<bool>(type: "bit", nullable: false),
                    ViewDelivery = table.Column<bool>(type: "bit", nullable: false),
                    CreateDelivery = table.Column<bool>(type: "bit", nullable: false),
                    EditDelivery = table.Column<bool>(type: "bit", nullable: false),
                    ViewReports = table.Column<bool>(type: "bit", nullable: false),
                    ViewTraceability = table.Column<bool>(type: "bit", nullable: false),
                    AccessSettings = table.Column<bool>(type: "bit", nullable: false),
                    ManageUsers = table.Column<bool>(type: "bit", nullable: false),
                    ManageDocumentControl = table.Column<bool>(type: "bit", nullable: false),
                    NavigationLayout = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_permissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_permissions_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "inward_lines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InwardId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    SourceType = table.Column<int>(type: "int", nullable: false),
                    SourceRefId = table.Column<int>(type: "int", nullable: true),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    UnitId = table.Column<int>(type: "int", nullable: true),
                    Rate = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    GstPercent = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsQCPending = table.Column<bool>(type: "bit", nullable: false),
                    IsQCApproved = table.Column<bool>(type: "bit", nullable: false),
                    ReworkOfInwardLineId = table.Column<int>(type: "int", nullable: true),
                    ReworkFromQcEntryId = table.Column<int>(type: "int", nullable: true),
                    ItemNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ItemCodeSnapshot = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    DrawingNoSnapshot = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RevisionNoSnapshot = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    OrderNumberSnapshot = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ProductNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inward_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_inward_lines_inwards_InwardId",
                        column: x => x.InwardId,
                        principalTable: "inwards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_inward_lines_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inward_lines_units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "units",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "delivery_challans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ChallanNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DispatchDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    VehicleNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DriverName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DriverContact = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AttachmentUrlsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DocumentNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RevisionNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RevisionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_delivery_challans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_delivery_challans_orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_delivery_challans_parties_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_delivery_challans_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "boms",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    BomVersion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_boms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_boms_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_boms_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "qc_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QcEntryId = table.Column<int>(type: "int", nullable: false),
                    InwardLineId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    ApprovedQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    ReworkQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    RejectedQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Decision = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qc_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_qc_items_inward_lines_InwardLineId",
                        column: x => x.InwardLineId,
                        principalTable: "inward_lines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_qc_items_qc_entries_QcEntryId",
                        column: x => x.QcEntryId,
                        principalTable: "qc_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "bom_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BomId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    QuantityPerProduct = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    UnitId = table.Column<int>(type: "int", nullable: true),
                    Sequence = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bom_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_bom_items_boms_BomId",
                        column: x => x.BomId,
                        principalTable: "boms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_bom_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bom_items_units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "units",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "order_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    QuantityOrdered = table.Column<int>(type: "int", nullable: false),
                    BomId = table.Column<int>(type: "int", nullable: true),
                    ProducedQty = table.Column<int>(type: "int", nullable: false),
                    DeliveredQty = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProductCodeSnapshot = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    ProductNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_items_boms_BomId",
                        column: x => x.BomId,
                        principalTable: "boms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_items_orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_order_items_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "bom_item_processes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BomItemId = table.Column<int>(type: "int", nullable: false),
                    ProcessId = table.Column<int>(type: "int", nullable: false),
                    Sequence = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bom_item_processes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_bom_item_processes_bom_items_BomItemId",
                        column: x => x.BomItemId,
                        principalTable: "bom_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_bom_item_processes_processes_ProcessId",
                        column: x => x.ProcessId,
                        principalTable: "processes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "delivery_challan_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DeliveryChallanId = table.Column<int>(type: "int", nullable: false),
                    OrderItemId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    DispatchQuantity = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProductNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ProductCodeSnapshot = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_delivery_challan_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_delivery_challan_items_delivery_challans_DeliveryChallanId",
                        column: x => x.DeliveryChallanId,
                        principalTable: "delivery_challans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_delivery_challan_items_order_items_OrderItemId",
                        column: x => x.OrderItemId,
                        principalTable: "order_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_delivery_challan_items_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_bom_item_plans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderItemId = table.Column<int>(type: "int", nullable: false),
                    BomItemId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    RequiredQuantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    UnitId = table.Column<int>(type: "int", nullable: true),
                    Sequence = table.Column<int>(type: "int", nullable: false),
                    ItemNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ItemCodeSnapshot = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    IndentedQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    OrderedQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    InwardedQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    QcApprovedQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    QcReworkQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    QcRejectedQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    JobWorkSentQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    ReadyQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    ConsumedQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    FirstActivityAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastActivityAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_bom_item_plans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_bom_item_plans_bom_items_BomItemId",
                        column: x => x.BomItemId,
                        principalTable: "bom_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_bom_item_plans_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_order_bom_item_plans_order_items_OrderItemId",
                        column: x => x.OrderItemId,
                        principalTable: "order_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_order_bom_item_plans_units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "units",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "production_entries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductionNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ProductionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    OrderItemId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    PlannedQty = table.Column<int>(type: "int", nullable: false),
                    ProducedQty = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OrderNumberSnapshot = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ProductNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ProductCodeSnapshot = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_production_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_production_entries_order_items_OrderItemId",
                        column: x => x.OrderItemId,
                        principalTable: "order_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_production_entries_orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_production_entries_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_production_entries_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_indent_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseIndentId = table.Column<int>(type: "int", nullable: false),
                    OrderItemId = table.Column<int>(type: "int", nullable: true),
                    OrderBomItemPlanId = table.Column<int>(type: "int", nullable: true),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    UnitId = table.Column<int>(type: "int", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ItemNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ItemCodeSnapshot = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    DrawingNoSnapshot = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RevisionNoSnapshot = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    OrderNumberSnapshot = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ProductNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_indent_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_indent_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_indent_items_order_bom_item_plans_OrderBomItemPlanId",
                        column: x => x.OrderBomItemPlanId,
                        principalTable: "order_bom_item_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_indent_items_order_items_OrderItemId",
                        column: x => x.OrderItemId,
                        principalTable: "order_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_indent_items_purchase_indents_PurchaseIndentId",
                        column: x => x.PurchaseIndentId,
                        principalTable: "purchase_indents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_indent_items_units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "units",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "production_consumptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductionEntryId = table.Column<int>(type: "int", nullable: false),
                    OrderBomItemPlanId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    QuantityConsumed = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ItemNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ItemCodeSnapshot = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_production_consumptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_production_consumptions_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_production_consumptions_order_bom_item_plans_OrderBomItemPlanId",
                        column: x => x.OrderBomItemPlanId,
                        principalTable: "order_bom_item_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_production_consumptions_production_entries_ProductionEntryId",
                        column: x => x.ProductionEntryId,
                        principalTable: "production_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "job_work_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobWorkId = table.Column<int>(type: "int", nullable: false),
                    PurchaseIndentItemId = table.Column<int>(type: "int", nullable: true),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Rate = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    GstPercent = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ItemNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ItemCodeSnapshot = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    OrderNumberSnapshot = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ProductNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_work_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_job_work_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_job_work_items_job_works_JobWorkId",
                        column: x => x.JobWorkId,
                        principalTable: "job_works",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_job_work_items_purchase_indent_items_PurchaseIndentItemId",
                        column: x => x.PurchaseIndentItemId,
                        principalTable: "purchase_indent_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "purchase_order_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseOrderId = table.Column<int>(type: "int", nullable: false),
                    PurchaseIndentItemId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Rate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ItemNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ItemCodeSnapshot = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    OrderNumberSnapshot = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ProductNameSnapshot = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_order_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_order_items_purchase_indent_items_PurchaseIndentItemId",
                        column: x => x.PurchaseIndentItemId,
                        principalTable: "purchase_indent_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_order_items_purchase_orders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "purchase_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_UserId",
                table: "audit_logs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_bom_item_processes_BomItemId_ProcessId",
                table: "bom_item_processes",
                columns: new[] { "BomItemId", "ProcessId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_bom_item_processes_ProcessId",
                table: "bom_item_processes",
                column: "ProcessId");

            migrationBuilder.CreateIndex(
                name: "IX_bom_items_BomId_ItemId",
                table: "bom_items",
                columns: new[] { "BomId", "ItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_bom_items_ItemId",
                table: "bom_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_bom_items_UnitId",
                table: "bom_items",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_boms_CreatedBy",
                table: "boms",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_boms_ProductId_BomVersion",
                table: "boms",
                columns: new[] { "ProductId", "BomVersion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_code_sequences_Key",
                table: "code_sequences",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_delivery_challan_items_DeliveryChallanId",
                table: "delivery_challan_items",
                column: "DeliveryChallanId");

            migrationBuilder.CreateIndex(
                name: "IX_delivery_challan_items_OrderItemId",
                table: "delivery_challan_items",
                column: "OrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_delivery_challan_items_ProductId",
                table: "delivery_challan_items",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_delivery_challans_ChallanNo",
                table: "delivery_challans",
                column: "ChallanNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_delivery_challans_CreatedBy",
                table: "delivery_challans",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_delivery_challans_CustomerId",
                table: "delivery_challans",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_delivery_challans_OrderId",
                table: "delivery_challans",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_inward_lines_InwardId",
                table: "inward_lines",
                column: "InwardId");

            migrationBuilder.CreateIndex(
                name: "IX_inward_lines_ItemId",
                table: "inward_lines",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_inward_lines_UnitId",
                table: "inward_lines",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_inwards_CreatedBy",
                table: "inwards",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_inwards_InwardNo",
                table: "inwards",
                column: "InwardNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inwards_VendorId",
                table: "inwards",
                column: "VendorId");

            migrationBuilder.CreateIndex(
                name: "IX_item_categories_Name",
                table: "item_categories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_item_groups_Name",
                table: "item_groups",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_item_types_Name",
                table: "item_types",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_items_CreatedBy",
                table: "items",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_items_ItemCategoryId",
                table: "items",
                column: "ItemCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_items_ItemCode",
                table: "items",
                column: "ItemCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_items_ItemGroupId",
                table: "items",
                column: "ItemGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_items_ItemName",
                table: "items",
                column: "ItemName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_items_ItemTypeId",
                table: "items",
                column: "ItemTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_items_MaterialId",
                table: "items",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_items_UnitId",
                table: "items",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_job_work_items_ItemId",
                table: "job_work_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_job_work_items_JobWorkId",
                table: "job_work_items",
                column: "JobWorkId");

            migrationBuilder.CreateIndex(
                name: "IX_job_work_items_PurchaseIndentItemId",
                table: "job_work_items",
                column: "PurchaseIndentItemId");

            migrationBuilder.CreateIndex(
                name: "IX_job_works_CreatedBy",
                table: "job_works",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_job_works_JobWorkNo",
                table: "job_works",
                column: "JobWorkNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_job_works_ProcessId",
                table: "job_works",
                column: "ProcessId");

            migrationBuilder.CreateIndex(
                name: "IX_job_works_ToPartyId",
                table: "job_works",
                column: "ToPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_materials_Name",
                table: "materials",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_order_bom_item_plans_BomItemId",
                table: "order_bom_item_plans",
                column: "BomItemId");

            migrationBuilder.CreateIndex(
                name: "IX_order_bom_item_plans_ItemId",
                table: "order_bom_item_plans",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_order_bom_item_plans_OrderItemId_BomItemId",
                table: "order_bom_item_plans",
                columns: new[] { "OrderItemId", "BomItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_order_bom_item_plans_UnitId",
                table: "order_bom_item_plans",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_order_items_BomId",
                table: "order_items",
                column: "BomId");

            migrationBuilder.CreateIndex(
                name: "IX_order_items_OrderId",
                table: "order_items",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_order_items_ProductId",
                table: "order_items",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_orders_CreatedBy",
                table: "orders",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_orders_CustomerId",
                table: "orders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_orders_OrderNumber",
                table: "orders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_parties_PartyName_PartyType",
                table: "parties",
                columns: new[] { "PartyName", "PartyType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_processes_ProcessName",
                table: "processes",
                column: "ProcessName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_Name",
                table: "product_categories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_production_consumptions_ItemId",
                table: "production_consumptions",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_production_consumptions_OrderBomItemPlanId",
                table: "production_consumptions",
                column: "OrderBomItemPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_production_consumptions_ProductionEntryId",
                table: "production_consumptions",
                column: "ProductionEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_production_entries_CreatedBy",
                table: "production_entries",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_production_entries_OrderId",
                table: "production_entries",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_production_entries_OrderItemId",
                table: "production_entries",
                column: "OrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_production_entries_ProductId",
                table: "production_entries",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_production_entries_ProductionNo",
                table: "production_entries",
                column: "ProductionNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_products_CreatedBy",
                table: "products",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_products_ProductCategoryId",
                table: "products",
                column: "ProductCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_products_ProductCode",
                table: "products",
                column: "ProductCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_products_ProductName",
                table: "products",
                column: "ProductName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_products_UnitId",
                table: "products",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indent_items_ItemId",
                table: "purchase_indent_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indent_items_OrderBomItemPlanId",
                table: "purchase_indent_items",
                column: "OrderBomItemPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indent_items_OrderItemId",
                table: "purchase_indent_items",
                column: "OrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indent_items_PurchaseIndentId",
                table: "purchase_indent_items",
                column: "PurchaseIndentId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indent_items_UnitId",
                table: "purchase_indent_items",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indents_ApprovedBy",
                table: "purchase_indents",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indents_CreatedBy",
                table: "purchase_indents",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indents_PiNo",
                table: "purchase_indents",
                column: "PiNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_order_items_PurchaseIndentItemId",
                table: "purchase_order_items",
                column: "PurchaseIndentItemId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_order_items_PurchaseOrderId",
                table: "purchase_order_items",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_ApprovedBy",
                table: "purchase_orders",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_CreatedBy",
                table: "purchase_orders",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_PoNo",
                table: "purchase_orders",
                column: "PoNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_VendorId",
                table: "purchase_orders",
                column: "VendorId");

            migrationBuilder.CreateIndex(
                name: "IX_qc_entries_ApprovedBy",
                table: "qc_entries",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_qc_entries_CreatedBy",
                table: "qc_entries",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_qc_entries_PartyId",
                table: "qc_entries",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_qc_entries_QcNo",
                table: "qc_entries",
                column: "QcNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qc_items_InwardLineId",
                table: "qc_items",
                column: "InwardLineId");

            migrationBuilder.CreateIndex(
                name: "IX_qc_items_QcEntryId",
                table: "qc_items",
                column: "QcEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_units_Name",
                table: "units",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_permissions_UserId",
                table: "user_permissions",
                column: "UserId",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "app_settings");

            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "bom_item_processes");

            migrationBuilder.DropTable(
                name: "code_sequences");

            migrationBuilder.DropTable(
                name: "delivery_challan_items");

            migrationBuilder.DropTable(
                name: "document_controls");

            migrationBuilder.DropTable(
                name: "job_work_items");

            migrationBuilder.DropTable(
                name: "production_consumptions");

            migrationBuilder.DropTable(
                name: "purchase_order_items");

            migrationBuilder.DropTable(
                name: "qc_items");

            migrationBuilder.DropTable(
                name: "user_permissions");

            migrationBuilder.DropTable(
                name: "delivery_challans");

            migrationBuilder.DropTable(
                name: "job_works");

            migrationBuilder.DropTable(
                name: "production_entries");

            migrationBuilder.DropTable(
                name: "purchase_indent_items");

            migrationBuilder.DropTable(
                name: "purchase_orders");

            migrationBuilder.DropTable(
                name: "inward_lines");

            migrationBuilder.DropTable(
                name: "qc_entries");

            migrationBuilder.DropTable(
                name: "processes");

            migrationBuilder.DropTable(
                name: "order_bom_item_plans");

            migrationBuilder.DropTable(
                name: "purchase_indents");

            migrationBuilder.DropTable(
                name: "inwards");

            migrationBuilder.DropTable(
                name: "bom_items");

            migrationBuilder.DropTable(
                name: "order_items");

            migrationBuilder.DropTable(
                name: "items");

            migrationBuilder.DropTable(
                name: "boms");

            migrationBuilder.DropTable(
                name: "orders");

            migrationBuilder.DropTable(
                name: "item_categories");

            migrationBuilder.DropTable(
                name: "item_groups");

            migrationBuilder.DropTable(
                name: "item_types");

            migrationBuilder.DropTable(
                name: "materials");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "parties");

            migrationBuilder.DropTable(
                name: "product_categories");

            migrationBuilder.DropTable(
                name: "units");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
