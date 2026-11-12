export type MarketplaceCode = 'AMAZON'|'FLIPKART'|'MEESHO'|'SHOPIFY'|'WOOCOMMERCE'|'EBAY'|'ETSY'|'WALMART'|'OTHER';
export type ConnectionStatus = 'NOT_CONNECTED'|'PENDING_APPROVAL'|'CONNECTED'|'ERROR'|'DISABLED';
export interface MarketplaceCapabilities { catalogRead:boolean; catalogWrite:boolean; ordersRead:boolean; inventoryWrite:boolean; returnsRead:boolean; }
export interface MarketplaceAdapter {
 code: MarketplaceCode;
 displayName: string;
 capabilities: MarketplaceCapabilities;
 // Implement only with the marketplace's currently approved official API.
 connect(tenantId:string): Promise<ConnectionStatus>;
}
