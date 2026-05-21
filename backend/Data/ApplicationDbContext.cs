using Microsoft.EntityFrameworkCore;
using net_backend.Models;

namespace net_backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        // System
        public DbSet<AppSettings> AppSettings { get; set; } = default!;
        public DbSet<DocumentControl> DocumentControls { get; set; } = default!;
        public DbSet<AuditLog> AuditLogs { get; set; } = default!;
        public DbSet<CodeSequence> CodeSequences { get; set; } = default!;

        // Users
        public DbSet<User> Users { get; set; } = default!;
        public DbSet<UserPermission> UserPermissions { get; set; } = default!;

        // Master
        public DbSet<Party> Parties { get; set; } = default!;
        public DbSet<ItemType> ItemTypes { get; set; } = default!;
        public DbSet<ItemCategory> ItemCategories { get; set; } = default!;
        public DbSet<ItemGroup> ItemGroups { get; set; } = default!;
        public DbSet<ProductCategory> ProductCategories { get; set; } = default!;
        public DbSet<Material> Materials { get; set; } = default!;
        public DbSet<Unit> Units { get; set; } = default!;
        public DbSet<Product> Products { get; set; } = default!;
        public DbSet<Item> Items { get; set; } = default!;
        public DbSet<ProcessMaster> Processes { get; set; } = default!;

        // BOM
        public DbSet<Bom> Boms { get; set; } = default!;
        public DbSet<BomItem> BomItems { get; set; } = default!;
        public DbSet<BomItemProcess> BomItemProcesses { get; set; } = default!;

        // Order
        public DbSet<Order> Orders { get; set; } = default!;
        public DbSet<OrderItem> OrderItems { get; set; } = default!;
        public DbSet<OrderBomItemPlan> OrderBomItemPlans { get; set; } = default!;

        // Transactions
        public DbSet<PurchaseIndent> PurchaseIndents { get; set; } = default!;
        public DbSet<PurchaseIndentItem> PurchaseIndentItems { get; set; } = default!;
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; } = default!;
        public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; } = default!;
        public DbSet<JobWork> JobWorks { get; set; } = default!;
        public DbSet<JobWorkItem> JobWorkItems { get; set; } = default!;
        public DbSet<Inward> Inwards { get; set; } = default!;
        public DbSet<InwardLine> InwardLines { get; set; } = default!;
        public DbSet<QualityControlEntry> QcEntries { get; set; } = default!;
        public DbSet<QualityControlItem> QcItems { get; set; } = default!;

        // Production & Delivery
        public DbSet<ProductionEntry> ProductionEntries { get; set; } = default!;
        public DbSet<ProductionConsumption> ProductionConsumptions { get; set; } = default!;
        public DbSet<DeliveryChallan> DeliveryChallans { get; set; } = default!;
        public DbSet<DeliveryChallanItem> DeliveryChallanItems { get; set; } = default!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ═══ Sequence keys are globally unique ═══
            modelBuilder.Entity<CodeSequence>().HasIndex(s => s.Key).IsUnique();

            // ═══ Unique business keys ═══
            modelBuilder.Entity<Party>().HasIndex(p => new { p.PartyName, p.PartyType }).IsUnique();
            modelBuilder.Entity<Product>().HasIndex(p => p.ProductCode).IsUnique();
            modelBuilder.Entity<Product>().HasIndex(p => p.ProductName).IsUnique();
            modelBuilder.Entity<Item>().HasIndex(i => i.ItemCode).IsUnique();
            modelBuilder.Entity<Item>().HasIndex(i => i.ItemName).IsUnique();
            modelBuilder.Entity<ProcessMaster>().HasIndex(p => p.ProcessName).IsUnique();
            modelBuilder.Entity<Order>().HasIndex(o => o.OrderNumber).IsUnique();
            modelBuilder.Entity<PurchaseIndent>().HasIndex(p => p.PiNo).IsUnique();
            modelBuilder.Entity<PurchaseOrder>().HasIndex(p => p.PoNo).IsUnique();
            modelBuilder.Entity<JobWork>().HasIndex(j => j.JobWorkNo).IsUnique();
            modelBuilder.Entity<Inward>().HasIndex(i => i.InwardNo).IsUnique();
            modelBuilder.Entity<QualityControlEntry>().HasIndex(q => q.QcNo).IsUnique();
            modelBuilder.Entity<ProductionEntry>().HasIndex(p => p.ProductionNo).IsUnique();
            modelBuilder.Entity<DeliveryChallan>().HasIndex(d => d.ChallanNo).IsUnique();
            modelBuilder.Entity<Bom>().HasIndex(b => new { b.ProductId, b.BomVersion }).IsUnique();

            // ═══ Sub-master uniqueness ═══
            modelBuilder.Entity<ItemType>().HasIndex(x => x.Name).IsUnique();
            modelBuilder.Entity<ItemCategory>().HasIndex(x => x.Name).IsUnique();
            modelBuilder.Entity<ItemGroup>().HasIndex(x => x.Name).IsUnique();
            modelBuilder.Entity<ProductCategory>().HasIndex(x => x.Name).IsUnique();
            modelBuilder.Entity<Material>().HasIndex(x => x.Name).IsUnique();
            modelBuilder.Entity<Unit>().HasIndex(x => x.Name).IsUnique();

            // ═══ Decimal precision ═══
            modelBuilder.Entity<BomItem>().Property(b => b.QuantityPerProduct).HasColumnType("decimal(18,4)");

            foreach (var prop in new[] {
                modelBuilder.Entity<OrderBomItemPlan>().Property(o => o.RequiredQuantity),
                modelBuilder.Entity<OrderBomItemPlan>().Property(o => o.IndentedQty),
                modelBuilder.Entity<OrderBomItemPlan>().Property(o => o.OrderedQty),
                modelBuilder.Entity<OrderBomItemPlan>().Property(o => o.InwardedQty),
                modelBuilder.Entity<OrderBomItemPlan>().Property(o => o.QcApprovedQty),
                modelBuilder.Entity<OrderBomItemPlan>().Property(o => o.QcReworkQty),
                modelBuilder.Entity<OrderBomItemPlan>().Property(o => o.QcRejectedQty),
                modelBuilder.Entity<OrderBomItemPlan>().Property(o => o.JobWorkSentQty),
                modelBuilder.Entity<OrderBomItemPlan>().Property(o => o.ReadyQty),
                modelBuilder.Entity<OrderBomItemPlan>().Property(o => o.ConsumedQty)
            })
            {
                prop.HasColumnType("decimal(18,4)");
            }

            modelBuilder.Entity<PurchaseIndentItem>().Property(p => p.Quantity).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<PurchaseOrderItem>().Property(p => p.Quantity).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<PurchaseOrderItem>().Property(p => p.Rate).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<PurchaseOrder>().Property(p => p.GstPercent).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<JobWorkItem>().Property(j => j.Quantity).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<JobWorkItem>().Property(j => j.Rate).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<JobWorkItem>().Property(j => j.GstPercent).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<InwardLine>().Property(i => i.Quantity).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<InwardLine>().Property(i => i.Rate).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<InwardLine>().Property(i => i.GstPercent).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<QualityControlItem>().Property(q => q.Quantity).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<QualityControlItem>().Property(q => q.ApprovedQty).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<QualityControlItem>().Property(q => q.ReworkQty).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<QualityControlItem>().Property(q => q.RejectedQty).HasColumnType("decimal(18,4)");
            modelBuilder.Entity<ProductionConsumption>().Property(p => p.QuantityConsumed).HasColumnType("decimal(18,4)");

            // ═══ Relationships ═══

            // User permission 1:1
            modelBuilder.Entity<UserPermission>()
                .HasOne(up => up.User).WithOne(u => u.Permission)
                .HasForeignKey<UserPermission>(up => up.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Order → OrderItems (cascade)
            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Order).WithMany(o => o.Items)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Product).WithMany()
                .HasForeignKey(oi => oi.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Bom).WithMany()
                .HasForeignKey(oi => oi.BomId)
                .OnDelete(DeleteBehavior.Restrict);

            // OrderBomItemPlan
            modelBuilder.Entity<OrderBomItemPlan>()
                .HasOne(p => p.OrderItem).WithMany(oi => oi.BomPlan)
                .HasForeignKey(p => p.OrderItemId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<OrderBomItemPlan>()
                .HasOne(p => p.BomItem).WithMany()
                .HasForeignKey(p => p.BomItemId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<OrderBomItemPlan>()
                .HasOne(p => p.Item).WithMany()
                .HasForeignKey(p => p.ItemId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<OrderBomItemPlan>()
                .HasIndex(p => new { p.OrderItemId, p.BomItemId }).IsUnique();

            // BOM
            modelBuilder.Entity<BomItem>()
                .HasOne(bi => bi.Bom).WithMany(b => b.Items)
                .HasForeignKey(bi => bi.BomId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<BomItem>()
                .HasOne(bi => bi.Item).WithMany()
                .HasForeignKey(bi => bi.ItemId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<BomItem>()
                .HasIndex(bi => new { bi.BomId, bi.ItemId }).IsUnique();

            modelBuilder.Entity<BomItemProcess>()
                .HasOne(bp => bp.BomItem).WithMany(bi => bi.ProcessFlow)
                .HasForeignKey(bp => bp.BomItemId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<BomItemProcess>()
                .HasOne(bp => bp.Process).WithMany()
                .HasForeignKey(bp => bp.ProcessId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<BomItemProcess>()
                .HasIndex(bp => new { bp.BomItemId, bp.ProcessId }).IsUnique();

            // Purchase Indent
            modelBuilder.Entity<PurchaseIndentItem>()
                .HasOne(pii => pii.PurchaseIndent).WithMany(pi => pi.Items)
                .HasForeignKey(pii => pii.PurchaseIndentId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<PurchaseIndentItem>()
                .HasOne(pii => pii.Item).WithMany()
                .HasForeignKey(pii => pii.ItemId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<PurchaseIndentItem>()
                .HasOne(pii => pii.OrderItem).WithMany()
                .HasForeignKey(pii => pii.OrderItemId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<PurchaseIndentItem>()
                .HasOne(pii => pii.OrderBomItemPlan).WithMany()
                .HasForeignKey(pii => pii.OrderBomItemPlanId)
                .OnDelete(DeleteBehavior.Restrict);

            // Purchase Order
            modelBuilder.Entity<PurchaseOrderItem>()
                .HasOne(poi => poi.PurchaseOrder).WithMany(po => po.Items)
                .HasForeignKey(poi => poi.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<PurchaseOrderItem>()
                .HasOne(poi => poi.PurchaseIndentItem).WithMany()
                .HasForeignKey(poi => poi.PurchaseIndentItemId)
                .OnDelete(DeleteBehavior.Restrict);

            // Job Work
            modelBuilder.Entity<JobWorkItem>()
                .HasOne(ji => ji.JobWork).WithMany(j => j.Items)
                .HasForeignKey(ji => ji.JobWorkId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<JobWorkItem>()
                .HasOne(ji => ji.Item).WithMany()
                .HasForeignKey(ji => ji.ItemId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<JobWorkItem>()
                .HasOne(ji => ji.PurchaseIndentItem).WithMany()
                .HasForeignKey(ji => ji.PurchaseIndentItemId)
                .OnDelete(DeleteBehavior.Restrict);

            // Inward
            modelBuilder.Entity<InwardLine>()
                .HasOne(l => l.Inward).WithMany(i => i.Lines)
                .HasForeignKey(l => l.InwardId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<InwardLine>()
                .HasOne(l => l.Item).WithMany()
                .HasForeignKey(l => l.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            // QC
            modelBuilder.Entity<QualityControlItem>()
                .HasOne(q => q.QcEntry).WithMany(e => e.Items)
                .HasForeignKey(q => q.QcEntryId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<QualityControlItem>()
                .HasOne(q => q.InwardLine).WithMany()
                .HasForeignKey(q => q.InwardLineId)
                .OnDelete(DeleteBehavior.Restrict);

            // Production
            modelBuilder.Entity<ProductionEntry>()
                .HasOne(p => p.Order).WithMany()
                .HasForeignKey(p => p.OrderId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ProductionEntry>()
                .HasOne(p => p.OrderItem).WithMany()
                .HasForeignKey(p => p.OrderItemId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ProductionEntry>()
                .HasOne(p => p.Product).WithMany()
                .HasForeignKey(p => p.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ProductionConsumption>()
                .HasOne(pc => pc.ProductionEntry).WithMany(pe => pe.Consumptions)
                .HasForeignKey(pc => pc.ProductionEntryId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ProductionConsumption>()
                .HasOne(pc => pc.OrderBomItemPlan).WithMany()
                .HasForeignKey(pc => pc.OrderBomItemPlanId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ProductionConsumption>()
                .HasOne(pc => pc.Item).WithMany()
                .HasForeignKey(pc => pc.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            // Delivery
            modelBuilder.Entity<DeliveryChallan>()
                .HasOne(d => d.Order).WithMany()
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<DeliveryChallan>()
                .HasOne(d => d.Customer).WithMany()
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<DeliveryChallanItem>()
                .HasOne(dci => dci.DeliveryChallan).WithMany(dc => dc.Items)
                .HasForeignKey(dci => dci.DeliveryChallanId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<DeliveryChallanItem>()
                .HasOne(dci => dci.OrderItem).WithMany()
                .HasForeignKey(dci => dci.OrderItemId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<DeliveryChallanItem>()
                .HasOne(dci => dci.Product).WithMany()
                .HasForeignKey(dci => dci.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            // Audit
            modelBuilder.Entity<AuditLog>()
                .HasOne(a => a.User).WithMany(u => u.AuditLogs)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
