"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var claim_service_1 = require("../services/claim.service");
var Claim_1 = require("../models/Claim");
var errors_1 = require("../utils/errors");
jest.mock('../models/Claim');
describe('ClaimService', function () {
    var claimService;
    beforeEach(function () {
        claimService = new claim_service_1.ClaimService();
        jest.clearAllMocks();
    });
    describe('verifyCode', function () {
        it('should verify a valid claim code', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockClaim, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockClaim = {
                            code: 'TEST-001',
                            eventId: '0x1234',
                            tokenURI: 'ipfs://test',
                            eventName: 'Test Event',
                            status: 'available',
                            expiresAt: new Date('2025-12-31')
                        };
                        Claim_1.Claim.findOne.mockResolvedValue(mockClaim);
                        return [4 /*yield*/, claimService.verifyCode('TEST-001', '0x1234567890123456789012345678901234567890')];
                    case 1:
                        result = _a.sent();
                        expect(result.is_valid).toBe(true);
                        expect(result.eventId).toBe('0x1234');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should reject invalid wallet address', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, expect(claimService.verifyCode('TEST-001', 'invalid-address')).rejects.toThrow(errors_1.ApiError)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should reject expired claim', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockClaim;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockClaim = {
                            code: 'TEST-001',
                            status: 'available',
                            expiresAt: new Date('2020-01-01')
                        };
                        Claim_1.Claim.findOne.mockResolvedValue(mockClaim);
                        return [4 /*yield*/, expect(claimService.verifyCode('TEST-001', '0x1234567890123456789012345678901234567890')).rejects.toThrow('expired')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should reject already used claim', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockClaim;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockClaim = {
                            code: 'TEST-001',
                            status: 'used',
                            expiresAt: new Date('2025-12-31')
                        };
                        Claim_1.Claim.findOne.mockResolvedValue(mockClaim);
                        return [4 /*yield*/, expect(claimService.verifyCode('TEST-001', '0x1234567890123456789012345678901234567890')).rejects.toThrow('already been used')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('claimOffchain', function () {
        it('should create off-chain reservation with wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockClaim, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockClaim = {
                            code: 'TEST-001',
                            eventId: '0x1234',
                            eventName: 'Test Event',
                            tokenURI: 'ipfs://test',
                            status: 'available',
                            expiresAt: new Date('2025-12-31'),
                            save: jest.fn().mockResolvedValue(true)
                        };
                        Claim_1.Claim.findOne.mockResolvedValue(mockClaim);
                        return [4 /*yield*/, claimService.claimOffchain('TEST-001', '0x1234567890123456789012345678901234567890', 'wallet')];
                    case 1:
                        result = _a.sent();
                        expect(result.reservationId).toBeDefined();
                        expect(result.type).toBe('wallet');
                        expect(mockClaim.save).toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should create off-chain reservation with email', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockClaim, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockClaim = {
                            code: 'TEST-001',
                            eventId: '0x1234',
                            eventName: 'Test Event',
                            tokenURI: 'ipfs://test',
                            status: 'available',
                            expiresAt: new Date('2025-12-31'),
                            save: jest.fn().mockResolvedValue(true)
                        };
                        Claim_1.Claim.findOne.mockResolvedValue(mockClaim);
                        return [4 /*yield*/, claimService.claimOffchain('TEST-001', 'user@example.com', 'email')];
                    case 1:
                        result = _a.sent();
                        expect(result.reservationId).toBeDefined();
                        expect(result.type).toBe('email');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should reject invalid email format', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, expect(claimService.claimOffchain('TEST-001', 'invalid-email', 'email')).rejects.toThrow('Invalid email format')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should reject invalid type', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, expect(claimService.claimOffchain('TEST-001', 'test@example.com', 'invalid')).rejects.toThrow("Type must be 'wallet' or 'email'")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
