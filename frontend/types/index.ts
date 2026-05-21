// ─────────────────────────────────────── Enums

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
}

export enum PartyType {
  Customer = 'Customer',
  Vendor = 'Vendor',
  JobWorkVendor = 'JobWorkVendor',
}

export enum ProcessType {
  System = 'System',
  JobWork = 'JobWork',
}

export enum BomStatus {
  Draft = 'Draft',
  Active = 'Active',
  Inactive = 'Inactive',
}

export enum OrderStatus {
  Pending = 'Pending',
  InProcurement = 'InProcurement',
  InProduction = 'InProduction',
  PartiallyDelivered = 'PartiallyDelivered',
  FullyDelivered = 'FullyDelivered',
  Cancelled = 'Cancelled',
}

export enum PurchaseIndentType {
  New = 'New',
  Repair = 'Repair',
  Correction = 'Correction',
  Modification = 'Modification',
}

export enum PurchaseIndentFor {
  PurchaseOrder = 'PurchaseOrder',
  JobWork = 'JobWork',
}

export enum PurchaseIndentPriority {
  Normal = 'Normal',
  Urgent = 'Urgent',
  Critical = 'Critical',
}

export enum PurchaseIndentStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export enum PoStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export enum GstType {
  CGST_SGST = 'CGST_SGST',
  IGST = 'IGST',
  UGST = 'UGST',
}

export enum InwardSourceType {
  PO = 'PO',
  JobWork = 'JobWork',
}

export enum InwardStatus {
  Draft = 'Draft',
  Submitted = 'Submitted',
}

export enum QcStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export enum QcItemDecision {
  Pending = 'Pending',
  Approved = 'Approved',
  Rework = 'Rework',
  Rejected = 'Rejected',
}

export enum JobWorkStatus {
  Pending = 'Pending',
  InTransit = 'InTransit',
  Completed = 'Completed',
}

export enum ProductionStatus {
  Draft = 'Draft',
  Confirmed = 'Confirmed',
}

export enum DeliveryStatus {
  Draft = 'Draft',
  Dispatched = 'Dispatched',
}

export enum DocumentType {
  PurchaseIndent = 'PurchaseIndent',
  PurchaseOrder = 'PurchaseOrder',
  JobWork = 'JobWork',
  DeliveryChallan = 'DeliveryChallan',
}

// ─────────────────────────────────────── Common

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  totalCount?: number;
}

// ─────────────────────────────────────── User & Permissions

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  decryptedPassword?: string | null;
  role: Role;
  isActive: boolean;
  avatar?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
}

export interface UserPermission {
  id?: number;
  userId?: number;

  viewDashboard: boolean;
  exportDashboard: boolean;

  viewMaster: boolean;
  addMaster: boolean;
  editMaster: boolean;
  importMaster: boolean;
  exportMaster: boolean;

  manageParty: boolean;
  manageProduct: boolean;
  manageItem: boolean;
  manageProcess: boolean;
  manageBom: boolean;
  manageItemType: boolean;
  manageItemCategory: boolean;
  manageItemGroup: boolean;
  manageProductCategory: boolean;
  manageMaterial: boolean;
  manageUnit: boolean;

  viewOrder: boolean;
  createOrder: boolean;
  editOrder: boolean;
  approveOrder: boolean;

  viewPI: boolean;
  createPI: boolean;
  editPI: boolean;
  approvePI: boolean;

  viewPO: boolean;
  createPO: boolean;
  editPO: boolean;
  approvePO: boolean;

  viewInward: boolean;
  createInward: boolean;
  editInward: boolean;

  viewQC: boolean;
  createQC: boolean;
  editQC: boolean;
  approveQC: boolean;

  viewJobWork: boolean;
  createJobWork: boolean;
  editJobWork: boolean;

  viewProduction: boolean;
  createProduction: boolean;
  editProduction: boolean;

  viewDelivery: boolean;
  createDelivery: boolean;
  editDelivery: boolean;

  viewReports: boolean;
  viewTraceability: boolean;
  accessSettings: boolean;
  manageUsers: boolean;
  manageDocumentControl: boolean;

  navigationLayout: 'SIDEBAR' | 'HORIZONTAL';
}

// ─────────────────────────────────────── App Settings

export interface AppSettings {
  id: number;
  companyName?: string | null;
  softwareName?: string | null;
  primaryColor?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  gstNo?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────── Master

export interface Party {
  id: number;
  partyName: string;
  partyType: PartyType;
  contactPerson?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  gstNo?: string | null;
  gstDate?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NamedMaster {
  id: number;
  name: string;
  isActive: boolean;
}

export interface UnitMaster extends NamedMaster {
  symbol?: string | null;
}

export interface Product {
  id: number;
  productCode: string;
  productName: string;
  productCategoryId?: number | null;
  productCategoryName?: string | null;
  unitId?: number | null;
  unitName?: string | null;
  unitSymbol?: string | null;
  drawingNumber?: string | null;
  revisionNumber?: string | null;
  drawingFileUrl?: string | null;
  standardBomAvailable: boolean;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeBomCount?: number;
}

export interface Item {
  id: number;
  itemCode: string;
  itemName: string;
  itemCategoryId?: number | null;
  itemCategoryName?: string | null;
  itemTypeId?: number | null;
  itemTypeName?: string | null;
  itemGroupId?: number | null;
  itemGroupName?: string | null;
  materialId?: number | null;
  materialName?: string | null;
  unitId?: number | null;
  unitName?: string | null;
  unitSymbol?: string | null;
  drawingNumber?: string | null;
  revisionNumber?: string | null;
  drawingFileUrl?: string | null;
  validationRequired: boolean;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessMaster {
  id: number;
  processName: string;
  processType: ProcessType;
  sequenceNumber: number;
  isMandatory: boolean;
  isSystem: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────── BOM

export interface BomItemProcess {
  id: number;
  processId: number;
  processName?: string | null;
  processType?: ProcessType;
  sequence: number;
}

export interface BomItem {
  id: number;
  itemId: number;
  itemCode?: string | null;
  itemName?: string | null;
  quantityPerProduct: number;
  unitId?: number | null;
  unitName?: string | null;
  unitSymbol?: string | null;
  sequence: number;
  remarks?: string | null;
  processFlow: BomItemProcess[];
}

export interface Bom {
  id: number;
  productId: number;
  productName?: string | null;
  productCode?: string | null;
  bomVersion: string;
  status: BomStatus;
  remarks?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: BomItem[];
}

// ─────────────────────────────────────── Order

export interface OrderBomPlan {
  id: number;
  bomItemId: number;
  itemId: number;
  itemCode?: string | null;
  itemName?: string | null;
  requiredQuantity: number;
  unitId?: number | null;
  unitSymbol?: string | null;
  sequence: number;
  indentedQty: number;
  orderedQty: number;
  inwardedQty: number;
  qcApprovedQty: number;
  qcReworkQty: number;
  qcRejectedQty: number;
  jobWorkSentQty: number;
  readyQty: number;
  consumedQty: number;
  firstActivityAt?: string | null;
  lastActivityAt?: string | null;
}

export interface OrderItem {
  id: number;
  productId: number;
  productCode?: string | null;
  productName?: string | null;
  quantityOrdered: number;
  producedQty: number;
  deliveredQty: number;
  bomId?: number | null;
  bomVersion?: string | null;
  remarks?: string | null;
  bomPlan: OrderBomPlan[];
}

export interface Order {
  id: number;
  orderNumber: string;
  orderDate: string;
  requiredDeliveryDate?: string | null;
  notes?: string | null;
  status: OrderStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customerId: number;
  customerName?: string | null;
  customerContact?: string | null;
  items: OrderItem[];
}

// ─────────────────────────────────────── Transactions

export interface PurchaseIndentItem {
  id: number;
  itemId: number;
  itemCode?: string | null;
  itemName?: string | null;
  orderItemId?: number | null;
  orderBomItemPlanId?: number | null;
  orderNumber?: string | null;
  productName?: string | null;
  quantity: number;
  unitId?: number | null;
  unitSymbol?: string | null;
  itemNameSnapshot?: string | null;
  itemCodeSnapshot?: string | null;
  drawingNoSnapshot?: string | null;
  revisionNoSnapshot?: string | null;
  orderNumberSnapshot?: string | null;
  productNameSnapshot?: string | null;
  remarks?: string | null;
}

export interface PurchaseIndent {
  id: number;
  piNo: string;
  indentFor: PurchaseIndentFor;
  type: PurchaseIndentType;
  priority: PurchaseIndentPriority;
  status: PurchaseIndentStatus;
  remarks?: string | null;
  reqDateOfDelivery?: string | null;
  mtcReq: boolean;
  documentNo?: string | null;
  revisionNo?: string | null;
  revisionDate?: string | null;
  createdByName?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  items: PurchaseIndentItem[];
}

export interface PurchaseOrderItem {
  id: number;
  purchaseIndentItemId: number;
  piNo?: string | null;
  itemId?: number | null;
  itemCode?: string | null;
  itemName?: string | null;
  quantity: number;
  rate: number;
  itemNameSnapshot?: string | null;
  itemCodeSnapshot?: string | null;
  orderNumberSnapshot?: string | null;
  productNameSnapshot?: string | null;
}

export interface PurchaseOrder {
  id: number;
  poNo: string;
  vendorId: number;
  vendorName?: string | null;
  vendorContact?: string | null;
  vendorGst?: string | null;
  deliveryDate?: string | null;
  quotationNo?: string | null;
  quotationUrlsJson?: string | null;
  gstType?: GstType | null;
  gstPercent?: number | null;
  purchaseType?: string | null;
  status: PoStatus;
  remarks?: string | null;
  documentNo?: string | null;
  revisionNo?: string | null;
  revisionDate?: string | null;
  createdByName?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  items: PurchaseOrderItem[];
}

export interface InwardLine {
  id: number;
  itemId: number;
  itemCode?: string | null;
  itemName?: string | null;
  sourceType: InwardSourceType;
  sourceRefId: number;
  quantity: number;
  unitId?: number | null;
  unitSymbol?: string | null;
  rate?: number | null;
  gstPercent?: number | null;
  remarks?: string | null;
  isQCPending: boolean;
  isQCApproved: boolean;
  itemNameSnapshot?: string | null;
  itemCodeSnapshot?: string | null;
  drawingNoSnapshot?: string | null;
  revisionNoSnapshot?: string | null;
  orderNumberSnapshot?: string | null;
  productNameSnapshot?: string | null;
}

export interface Inward {
  id: number;
  inwardNo: string;
  grnNumber?: string | null;
  inwardDate: string;
  vendorId?: number | null;
  vendorName?: string | null;
  status: InwardStatus;
  remarks?: string | null;
  attachmentUrlsJson?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  lines: InwardLine[];
}

export interface QcItem {
  id: number;
  inwardLineId: number;
  inwardNo?: string | null;
  quantity: number;
  approvedQty: number;
  reworkQty: number;
  rejectedQty: number;
  decision: QcItemDecision;
  remarks?: string | null;
  itemCode?: string | null;
  itemName?: string | null;
  orderNumber?: string | null;
  productName?: string | null;
}

export interface QcEntry {
  id: number;
  qcNo: string;
  status: QcStatus;
  sourceType: InwardSourceType;
  remarks?: string | null;
  attachmentUrlsJson?: string | null;
  createdByName?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  partyId: number;
  partyName?: string | null;
  items: QcItem[];
}

export interface JobWorkItem {
  id: number;
  purchaseIndentItemId?: number | null;
  piNo?: string | null;
  itemId: number;
  itemCode?: string | null;
  itemName?: string | null;
  quantity: number;
  rate?: number | null;
  gstPercent?: number | null;
  remarks?: string | null;
  itemNameSnapshot?: string | null;
  itemCodeSnapshot?: string | null;
  orderNumberSnapshot?: string | null;
  productNameSnapshot?: string | null;
}

export interface JobWork {
  id: number;
  jobWorkNo: string;
  status: JobWorkStatus;
  outwardDate: string;
  expectedReturnDate?: string | null;
  inwardDate?: string | null;
  description?: string | null;
  remarks?: string | null;
  toPartyId: number;
  toPartyName?: string | null;
  processId?: number | null;
  processName?: string | null;
  attachmentUrlsJson?: string | null;
  documentNo?: string | null;
  revisionNo?: string | null;
  revisionDate?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  items: JobWorkItem[];
}

export interface ProductionConsumption {
  id: number;
  orderBomItemPlanId: number;
  itemId: number;
  itemCode?: string | null;
  itemName?: string | null;
  quantityConsumed: number;
}

export interface ProductionEntry {
  id: number;
  productionNo: string;
  productionDate: string;
  plannedQty: number;
  producedQty: number;
  status: ProductionStatus;
  remarks?: string | null;
  orderId: number;
  orderNumber?: string | null;
  orderItemId: number;
  productId: number;
  productName?: string | null;
  productCode?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  consumptions: ProductionConsumption[];
}

export interface DeliveryChallanItem {
  id: number;
  orderItemId: number;
  productId: number;
  productCode?: string | null;
  productName?: string | null;
  dispatchQuantity: number;
  remarks?: string | null;
  productCodeSnapshot?: string | null;
  productNameSnapshot?: string | null;
}

export interface DeliveryChallan {
  id: number;
  challanNo: string;
  dispatchDate: string;
  vehicleNo?: string | null;
  driverName?: string | null;
  driverContact?: string | null;
  status: DeliveryStatus;
  remarks?: string | null;
  orderId: number;
  orderNumber?: string | null;
  customerId: number;
  customerName?: string | null;
  attachmentUrlsJson?: string | null;
  documentNo?: string | null;
  revisionNo?: string | null;
  revisionDate?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  items: DeliveryChallanItem[];
}

// ─────────────────────────────────────── Document Control

export interface DocumentControl {
  id: number;
  documentType: DocumentType;
  documentNo: string;
  revisionNo: string;
  revisionDate: string;
  isApplied: boolean;
  isActive: boolean;
}
