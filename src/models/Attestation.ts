import mongoose, { Schema, Document } from 'mongoose';

export interface IAttestation extends Document {
  attestationUID: string;
  eventId: string;
  walletAddress: string;
  isPremium: boolean;
  txHash: string;
  attestationTxHash: string;
  timestamp: Date;
  createdAt: Date;
}

const AttestationSchema = new Schema<IAttestation>({
  attestationUID: { type: String, required: true, unique: true, index: true },
  eventId: { type: String, required: true, index: true },
  walletAddress: { type: String, required: true, index: true },
  isPremium: { type: Boolean, required: true },
  txHash: { type: String, required: true },
  attestationTxHash: { type: String, required: true },
  timestamp: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Attestation = mongoose.model<IAttestation>('Attestation', AttestationSchema);
