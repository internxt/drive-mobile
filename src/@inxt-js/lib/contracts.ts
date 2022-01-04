export interface ContractNegotiated {
  hash: string;
  token: string;
  operation: 'PUSH';
  farmer: {
    userAgent: string;
    protocol: string;
    address: string;
    port: number;
    nodeID: string;
    lastSeen: number;
  };
}
