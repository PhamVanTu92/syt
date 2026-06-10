import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FacilityType =
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'lab'
  | 'rehabilitation'
  | 'nursing_home'
  | 'other'

export type FacilityStatus = 'active' | 'inactive' | 'pending' | 'suspended'

export interface Facility {
  id: string
  name: string
  code: string
  type: FacilityType
  status: FacilityStatus
  address: string | null
  district: string | null
  ward: string | null
  phone: string | null
  email: string | null
  website: string | null
  directorName: string | null
  licenseNumber: string | null
  licenseExpiryDate: string | null
  bedCount: number | null
  staffCount: number | null
  lat: number | null
  lng: number | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface FacilitiesFilters {
  page?: number
  limit?: number
  search?: string
  type?: FacilityType | ''
  status?: FacilityStatus | ''
  district?: string
}

export interface FacilitiesResponse {
  data: Facility[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CreateFacilityDto {
  name: string
  code: string
  type: FacilityType
  status?: FacilityStatus
  address?: string
  district?: string
  ward?: string
  phone?: string
  email?: string
  website?: string
  directorName?: string
  licenseNumber?: string
  licenseExpiryDate?: string
  bedCount?: number
  staffCount?: number
  lat?: number
  lng?: number
  description?: string
}

export type UpdateFacilityDto = Partial<CreateFacilityDto>

// ─── Social facilities (cơ sở xã hội) ──────────────────────────────────────

export interface SocialFacility {
  id: string
  name: string
  code: string
  facilityType: string
  status: FacilityStatus
  address: string | null
  district: string | null
  phone: string | null
  managerName: string | null
  capacity: number | null
  currentOccupancy: number | null
  targetGroup: string | null
  licenseNumber: string | null
  createdAt: string
  updatedAt: string
}

export interface SocialFacilitiesFilters {
  page?: number
  limit?: number
  search?: string
  status?: FacilityStatus | ''
  district?: string
}

export interface SocialFacilitiesResponse {
  data: SocialFacility[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CreateSocialFacilityDto {
  name: string
  code: string
  facilityType: string
  status?: FacilityStatus
  address?: string
  district?: string
  phone?: string
  managerName?: string
  capacity?: number
  currentOccupancy?: number
  targetGroup?: string
  licenseNumber?: string
}

export type UpdateSocialFacilityDto = Partial<CreateSocialFacilityDto>

// ─── Affiliated facilities (cơ sở trực thuộc) ───────────────────────────────

export interface AffiliatedFacility extends Facility {
  parentId: string | null
  level: number
}

export interface AffiliatedFacilitiesFilters extends FacilitiesFilters {
  parentId?: string
}

// ─── Trading facilities (cơ sở kinh doanh dược) ─────────────────────────────

export interface TradingFacility {
  id: string
  name: string
  code: string
  businessType: string
  status: FacilityStatus
  address: string | null
  district: string | null
  phone: string | null
  ownerName: string | null
  pharmacistName: string | null
  licenseNumber: string | null
  licenseExpiryDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TradingFacilitiesFilters {
  page?: number
  limit?: number
  search?: string
  status?: FacilityStatus | ''
  businessType?: string
  district?: string
}

export interface TradingFacilitiesResponse {
  data: TradingFacility[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CreateTradingFacilityDto {
  name: string
  code: string
  businessType: string
  status?: FacilityStatus
  address?: string
  district?: string
  phone?: string
  ownerName?: string
  pharmacistName?: string
  licenseNumber?: string
  licenseExpiryDate?: string
}

export type UpdateTradingFacilityDto = Partial<CreateTradingFacilityDto>

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const facilitiesKeys = {
  all: ['facilities'] as const,

  // Medical facilities
  medical: () => [...facilitiesKeys.all, 'medical'] as const,
  medicalLists: () => [...facilitiesKeys.medical(), 'list'] as const,
  medicalList: (filters: FacilitiesFilters) =>
    [...facilitiesKeys.medicalLists(), filters] as const,
  medicalDetail: (id: string) => [...facilitiesKeys.medical(), 'detail', id] as const,

  // Social facilities
  social: () => [...facilitiesKeys.all, 'social'] as const,
  socialLists: () => [...facilitiesKeys.social(), 'list'] as const,
  socialList: (filters: SocialFacilitiesFilters) =>
    [...facilitiesKeys.socialLists(), filters] as const,
  socialDetail: (id: string) => [...facilitiesKeys.social(), 'detail', id] as const,

  // Affiliated facilities
  affiliated: () => [...facilitiesKeys.all, 'affiliated'] as const,
  affiliatedLists: () => [...facilitiesKeys.affiliated(), 'list'] as const,
  affiliatedList: (filters: AffiliatedFacilitiesFilters) =>
    [...facilitiesKeys.affiliatedLists(), filters] as const,
  affiliatedDetail: (id: string) => [...facilitiesKeys.affiliated(), 'detail', id] as const,

  // Trading facilities
  trading: () => [...facilitiesKeys.all, 'trading'] as const,
  tradingLists: () => [...facilitiesKeys.trading(), 'list'] as const,
  tradingList: (filters: TradingFacilitiesFilters) =>
    [...facilitiesKeys.tradingLists(), filters] as const,
  tradingDetail: (id: string) => [...facilitiesKeys.trading(), 'detail', id] as const,
}

// ─── Medical Facilities Hooks ─────────────────────────────────────────────────

export function useFacilities(filters: FacilitiesFilters = {}) {
  return useQuery({
    queryKey: facilitiesKeys.medicalList(filters),
    queryFn: () =>
      api.get<never, FacilitiesResponse>('/facilities', { params: filters }),
  })
}

export function useFacility(id: string) {
  return useQuery({
    queryKey: facilitiesKeys.medicalDetail(id),
    queryFn: () => api.get<never, Facility>(`/facilities/${id}`),
    enabled: !!id,
  })
}

export function useCreateFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFacilityDto) =>
      api.post<never, Facility>('/facilities', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.medicalLists() })
    },
  })
}

export function useUpdateFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFacilityDto }) =>
      api.put<never, Facility>(`/facilities/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.medicalLists() })
      qc.invalidateQueries({ queryKey: facilitiesKeys.medicalDetail(id) })
    },
  })
}

export function useDeleteFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/facilities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.medicalLists() })
    },
  })
}

// ─── Social Facilities Hooks ──────────────────────────────────────────────────

export function useSocialFacilities(filters: SocialFacilitiesFilters = {}) {
  return useQuery({
    queryKey: facilitiesKeys.socialList(filters),
    queryFn: () =>
      api.get<never, SocialFacilitiesResponse>('/facilities/social', { params: filters }),
    staleTime: 5 * 60 * 1000, // PERF: facilities change rarely — 5min cache
  })
}

export function useSocialFacility(id: string) {
  return useQuery({
    queryKey: facilitiesKeys.socialDetail(id),
    queryFn: () => api.get<never, SocialFacility>(`/facilities/social/${id}`),
    enabled: !!id,
  })
}

export function useCreateSocialFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSocialFacilityDto) =>
      api.post<never, SocialFacility>('/facilities/social', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.socialLists() })
    },
  })
}

export function useUpdateSocialFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSocialFacilityDto }) =>
      api.put<never, SocialFacility>(`/facilities/social/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.socialLists() })
      qc.invalidateQueries({ queryKey: facilitiesKeys.socialDetail(id) })
    },
  })
}

export function useDeleteSocialFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/facilities/social/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.socialLists() })
    },
  })
}

// ─── Affiliated Facilities Hooks ──────────────────────────────────────────────

export function useAffiliatedFacilities(filters: AffiliatedFacilitiesFilters = {}) {
  return useQuery({
    queryKey: facilitiesKeys.affiliatedList(filters),
    queryFn: () =>
      api.get<never, { data: AffiliatedFacility[]; meta: FacilitiesResponse['meta'] }>(
        '/facilities/affiliated',
        { params: filters },
      ),
  })
}

export function useCreateAffiliatedFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFacilityDto & { parentId?: string }) =>
      api.post<never, AffiliatedFacility>('/facilities/affiliated', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.affiliatedLists() })
    },
  })
}

export function useUpdateAffiliatedFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFacilityDto }) =>
      api.put<never, AffiliatedFacility>(`/facilities/affiliated/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.affiliatedLists() })
      qc.invalidateQueries({ queryKey: facilitiesKeys.affiliatedDetail(id) })
    },
  })
}

export function useDeleteAffiliatedFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/facilities/affiliated/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.affiliatedLists() })
    },
  })
}

// ─── Trading Facilities Hooks ─────────────────────────────────────────────────

export function useTradingFacilities(filters: TradingFacilitiesFilters = {}) {
  return useQuery({
    queryKey: facilitiesKeys.tradingList(filters),
    queryFn: () =>
      api.get<never, TradingFacilitiesResponse>('/facilities/trading', { params: filters }),
  })
}

export function useCreateTradingFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTradingFacilityDto) =>
      api.post<never, TradingFacility>('/facilities/trading', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.tradingLists() })
    },
  })
}

export function useUpdateTradingFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTradingFacilityDto }) =>
      api.put<never, TradingFacility>(`/facilities/trading/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.tradingLists() })
      qc.invalidateQueries({ queryKey: facilitiesKeys.tradingDetail(id) })
    },
  })
}

export function useDeleteTradingFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/facilities/trading/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilitiesKeys.tradingLists() })
    },
  })
}
