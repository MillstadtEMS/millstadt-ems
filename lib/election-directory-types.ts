export type DirectoryParcel = { pin: string; parcel: string; group: string; area: string; taxable: string; before: number; after: number; increase: number };
export type DirectoryAddress = { id: string; address: string; city: string; number: string; street: string; parcels: DirectoryParcel[] };
export type DirectoryGroup = { id: string; name: string; kind: "subdivision" | "area"; addressIds: string[] };
export type ElectionDirectory = { year: number; addresses: DirectoryAddress[]; streets: { name: string; addressIds: string[] }[]; groups: DirectoryGroup[] };
