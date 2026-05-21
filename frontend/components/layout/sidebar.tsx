"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Users,
  Layers,
  FileText,
  ShoppingCart,
  ArrowLeftRight,
  Truck,
  ClipboardCheck,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  LogOut,
  FolderOpen,
  Briefcase,
  Factory,
  Boxes,
  Cog,
  ListTree,
  Network,
  ShoppingBag,
  Workflow,
} from "lucide-react";
import { Role } from "@/types";
import { useAppSettings, useCurrentUserPermissions } from "@/hooks/use-settings";
import { useLogout } from "@/hooks/use-auth-mutations";

interface SidebarProps {
  userRole: Role;
  currentUser?: any;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  sidebarWidth: number;
}

const SidebarText = ({ show, children, className = "" }: { show: boolean; children: React.ReactNode; className?: string }) => (
  <AnimatePresence>
    {show && (
      <motion.span
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -5 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`whitespace-nowrap ml-3 ${className}`}
      >
        {children}
      </motion.span>
    )}
  </AnimatePresence>
);

export function Sidebar({ userRole, expanded, onExpandChange, sidebarWidth }: SidebarProps) {
  const pathname = usePathname();
  const { data: appSettings } = useAppSettings();
  const { data: permissions } = useCurrentUserPermissions();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    master: true,
    order: true,
    procurement: true,
    production: true,
  });
  const [isHovered, setIsHovered] = useState(false);

  const HOVER_EXPANDED_WIDTH = 256;
  const showFullSidebar = expanded || isHovered;
  const currentWidth = expanded ? sidebarWidth : isHovered ? HOVER_EXPANDED_WIDTH : sidebarWidth;

  const toggleMenu = (menu: string) => setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));

  const logoutMutation = useLogout();
  const handleLogout = () => logoutMutation.mutate();

  const portalLabel = userRole === Role.ADMIN ? "Admin" : userRole === Role.MANAGER ? "Manager" : "User";

  const linkClass = (href: string, iconOnly = false) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    const base = "flex items-center gap-2 rounded-md transition-all text-sm cursor-pointer overflow-hidden " +
      (isActive
        ? "bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium shadow-sm"
        : "text-secondary-600 dark:[color:#c9d1d9] hover:bg-secondary-50 dark:hover:bg-[#21262d] hover:text-primary-600 dark:hover:text-primary-400");
    return iconOnly ? `${base} justify-center px-2 py-2.5` : `${base} px-4 py-2.5`;
  };

  const sectionHeaderClass = "flex items-center justify-between w-full px-3 py-1.5 rounded-md text-secondary-700 dark:[color:#e6edf3] hover:bg-secondary-50 dark:hover:bg-[#21262d] transition-all text-sm font-medium overflow-hidden";

  const renderMenuItem = (href: string, label: string, icon: any) => {
    const Icon = icon;
    return (
      <Link href={href} key={href}>
        <motion.div whileHover={showFullSidebar ? { x: 2 } : {}} className={linkClass(href, !showFullSidebar)}>
          <Icon className="w-5 h-5 shrink-0" />
          <SidebarText show={showFullSidebar} className="-ml-1">{label}</SidebarText>
        </motion.div>
      </Link>
    );
  };

  const renderSubMenuItem = (href: string, label: string, icon: any) => {
    const Icon = icon;
    return (
      <Link href={href} key={href}>
        <motion.div whileHover={{ x: 2 }} className={linkClass(href, false)}>
          <Icon className="w-5 h-5 shrink-0" />
          <SidebarText show={showFullSidebar} className="-ml-1">{label}</SidebarText>
        </motion.div>
      </Link>
    );
  };

  const canMaster = permissions?.viewMaster && (
    permissions?.manageParty || permissions?.manageProduct || permissions?.manageItem ||
    permissions?.manageProcess || permissions?.manageBom ||
    permissions?.manageItemType || permissions?.manageItemCategory || permissions?.manageItemGroup ||
    permissions?.manageProductCategory || permissions?.manageMaterial || permissions?.manageUnit);

  const otherMasters = permissions?.manageItemType || permissions?.manageItemCategory ||
    permissions?.manageItemGroup || permissions?.manageProductCategory ||
    permissions?.manageMaterial || permissions?.manageUnit;

  const canOrders = permissions?.viewOrder;

  const canProcurement = permissions?.viewPI || permissions?.viewPO ||
    permissions?.viewInward || permissions?.viewQC || permissions?.viewJobWork;

  const canProduction = permissions?.viewProduction || permissions?.viewDelivery || permissions?.viewTraceability;

  return (
    <aside
      className="h-screen fixed left-0 top-0 flex flex-col bg-white dark:bg-card border-r border-secondary-200 dark:border-border shadow-lg z-50 overflow-hidden transition-[width,background-color,border-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width: currentWidth }}
      onMouseEnter={() => !expanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`shrink-0 border-b border-secondary-200 bg-gradient-to-r from-primary-600 to-primary-700 flex transition-all duration-300 ${showFullSidebar ? "min-h-[5.5rem] px-4 py-3 items-center gap-3" : "min-h-[3.5rem] px-2 py-2 items-center justify-center"}`}>
        {showFullSidebar ? (
          <>
            <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 overflow-hidden">
              <SidebarText show={showFullSidebar} className="!ml-0 text-base font-bold text-white/90 truncate leading-tight block">
                {appSettings?.companyName || "Company"}
              </SidebarText>
              <SidebarText show={showFullSidebar} className="!ml-0 text-sm font-semibold text-white truncate leading-tight block">
                {appSettings?.softwareName || "Project Order Tracking"}
              </SidebarText>
              <SidebarText show={showFullSidebar} className="!ml-0 text-xs text-white/90 leading-tight block">
                {portalLabel}
              </SidebarText>
            </div>
            <button
              type="button"
              onClick={() => onExpandChange(!expanded)}
              className="shrink-0 p-1.5 rounded-md hover:bg-white/20 text-white transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onExpandChange(true)}
            className="shrink-0 p-2 rounded-md hover:bg-white/20 text-white transition-colors"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 scrollbar-hide">
        <div className="space-y-0.5">
          {permissions?.viewDashboard && renderMenuItem("/dashboard", "Dashboard", LayoutDashboard)}

          {/* Master */}
          {canMaster && (
            <div className="pt-1">
              {showFullSidebar ? (
                <>
                  <button onClick={() => toggleMenu('master')} className={sectionHeaderClass}>
                    <div className="flex items-center gap-1">
                      <FolderOpen className="w-4 h-4 text-secondary-500 dark:[color:#8b949e]" />
                      <SidebarText show={showFullSidebar} className="-ml-1">Masters</SidebarText>
                    </div>
                    {openMenus.master ? <ChevronDown className="w-4 h-4 text-secondary-400 dark:[color:#8b949e]" /> : <ChevronRight className="w-4 h-4 text-secondary-400 dark:[color:#8b949e]" />}
                  </button>
                  {openMenus.master && (
                    <div className="pl-1 mt-0.5 space-y-0.5">
                      {permissions?.manageParty && renderSubMenuItem("/parties", "Party Master", Users)}
                      {permissions?.manageProduct && renderSubMenuItem("/products", "Product Master", ShoppingBag)}
                      {permissions?.manageItem && renderSubMenuItem("/items", "Item Master", Package)}
                      {permissions?.manageProcess && renderSubMenuItem("/processes", "Process Master", Workflow)}
                      {permissions?.manageBom && renderSubMenuItem("/boms", "BOM Master", Network)}
                      {otherMasters && renderSubMenuItem("/masters", "Other Masters", Layers)}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  {permissions?.manageItem && renderMenuItem("/items", "Items", Package)}
                  {permissions?.manageProduct && renderMenuItem("/products", "Products", ShoppingBag)}
                  {permissions?.manageBom && renderMenuItem("/boms", "BOMs", Network)}
                  {otherMasters && renderMenuItem("/masters", "Masters", Layers)}
                </div>
              )}
            </div>
          )}

          {/* Orders */}
          {canOrders && (
            <div className={`pt-1 ${showFullSidebar ? "border-t border-secondary-100 dark:border-[#21262d] mt-1" : ""}`}>
              {renderMenuItem("/orders", "Sales Orders", ShoppingCart)}
            </div>
          )}

          {/* Procurement */}
          {canProcurement && (
            <div className={`pt-1 ${showFullSidebar ? "border-t border-secondary-100 dark:border-[#21262d] mt-1" : ""}`}>
              {showFullSidebar ? (
                <>
                  <button onClick={() => toggleMenu('procurement')} className={sectionHeaderClass}>
                    <div className="flex items-center gap-1">
                      <ArrowLeftRight className="w-4 h-4 text-secondary-500 dark:[color:#8b949e]" />
                      <SidebarText show={showFullSidebar} className="-ml-1">Procurement & QC</SidebarText>
                    </div>
                    {openMenus.procurement ? <ChevronDown className="w-4 h-4 text-secondary-400 dark:[color:#8b949e]" /> : <ChevronRight className="w-4 h-4 text-secondary-400 dark:[color:#8b949e]" />}
                  </button>
                  {openMenus.procurement && (
                    <div className="pl-1 mt-0.5 space-y-0.5">
                      {permissions?.viewPI && renderSubMenuItem("/purchase-indents", "Purchase Indent", FileText)}
                      {permissions?.viewPO && renderSubMenuItem("/purchase-orders", "Purchase Order", ShoppingCart)}
                      {permissions?.viewInward && renderSubMenuItem("/inwards", "Inward", ArrowLeftRight)}
                      {permissions?.viewQC && renderSubMenuItem("/quality-control", "Quality Check", ClipboardCheck)}
                      {permissions?.viewJobWork && renderSubMenuItem("/job-works", "Job Work", Briefcase)}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  {permissions?.viewPI && renderMenuItem("/purchase-indents", "PI", FileText)}
                  {permissions?.viewPO && renderMenuItem("/purchase-orders", "PO", ShoppingCart)}
                  {permissions?.viewInward && renderMenuItem("/inwards", "Inward", ArrowLeftRight)}
                  {permissions?.viewQC && renderMenuItem("/quality-control", "QC", ClipboardCheck)}
                  {permissions?.viewJobWork && renderMenuItem("/job-works", "JW", Briefcase)}
                </div>
              )}
            </div>
          )}

          {/* Production & Delivery */}
          {canProduction && (
            <div className={`pt-1 ${showFullSidebar ? "border-t border-secondary-100 dark:border-[#21262d] mt-1" : ""}`}>
              {showFullSidebar ? (
                <>
                  <button onClick={() => toggleMenu('production')} className={sectionHeaderClass}>
                    <div className="flex items-center gap-1">
                      <Cog className="w-4 h-4 text-secondary-500 dark:[color:#8b949e]" />
                      <SidebarText show={showFullSidebar} className="-ml-1">Production & Delivery</SidebarText>
                    </div>
                    {openMenus.production ? <ChevronDown className="w-4 h-4 text-secondary-400 dark:[color:#8b949e]" /> : <ChevronRight className="w-4 h-4 text-secondary-400 dark:[color:#8b949e]" />}
                  </button>
                  {openMenus.production && (
                    <div className="pl-1 mt-0.5 space-y-0.5">
                      {permissions?.viewProduction && renderSubMenuItem("/productions", "Production Entry", Factory)}
                      {permissions?.viewDelivery && renderSubMenuItem("/deliveries", "Delivery Challan", Truck)}
                      {permissions?.viewTraceability && renderSubMenuItem("/traceability", "Traceability", ListTree)}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  {permissions?.viewProduction && renderMenuItem("/productions", "Prod", Factory)}
                  {permissions?.viewDelivery && renderMenuItem("/deliveries", "DC", Truck)}
                  {permissions?.viewTraceability && renderMenuItem("/traceability", "Trace", ListTree)}
                </div>
              )}
            </div>
          )}

          {/* Reports & Settings */}
          <div className={`pt-1 ${showFullSidebar ? "border-t border-secondary-100 dark:border-[#21262d] mt-1" : ""} space-y-0.5`}>
            {permissions?.viewReports && renderMenuItem("/reports", "Reports", BarChart3)}
            {permissions?.accessSettings && renderMenuItem("/settings", "Settings", Settings)}
          </div>
        </div>
      </nav>

      <div className="shrink-0 p-3 border-t border-secondary-200 dark:border-[#21262d] bg-secondary-50 dark:bg-[#0d1117]">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all text-red-600 dark:[color:#f87171] hover:bg-red-50 dark:hover:bg-red-950/20 ${!showFullSidebar ? "justify-center" : "justify-start"}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <SidebarText show={showFullSidebar} className="-ml-1">Logout</SidebarText>
        </button>
      </div>
    </aside>
  );
}
