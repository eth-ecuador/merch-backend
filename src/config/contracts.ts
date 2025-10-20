import { ethers } from 'ethers';

export const MERCH_MANAGER_ABI = [
  'function registerEvent(bytes32 eventId, string memory metadata) external',
  'function mintSBTWithAttestation(address to, string memory tokenURI, bytes32 eventId) external returns (uint256, bytes32)',
  'function upgradeSBTWithAttestation(uint256 sbtId, address organizer, bytes32 eventId) external payable returns (uint256, bytes32)',
  'function isEventRegistered(bytes32 eventId) external view returns (bool)',
  'function getUpgradeFee() external view returns (uint256)'
];

export const EAS_INTEGRATION_ABI = [
  'function createAttendanceAttestation(bytes32 eventId, address attendee, uint256 tokenId, bool isPremiumUpgrade) external returns (bytes32)',
  'function getAttestation(bytes32 attestationId) external view returns (tuple(bytes32 eventId, uint64 timestamp, bool isPremiumUpgrade, address attendee, uint256 tokenId))'
];

export const CONTRACT_ADDRESSES = {
  merchManager: process.env.MERCH_MANAGER_ADDRESS!,
  basicMerch: process.env.BASIC_MERCH_ADDRESS!,
  premiumMerch: process.env.PREMIUM_MERCH_ADDRESS!,
  easIntegration: process.env.EAS_INTEGRATION_ADDRESS!
};