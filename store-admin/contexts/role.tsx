'use client'

import { createContext, useContext, type ReactNode } from 'react'

type Role = 'OWNER' | 'STAFF' | null

const RoleContext = createContext<Role>(null)

export function RoleProvider({ role, children }: { role: Role; children: ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function useRole(): Role {
  return useContext(RoleContext)
}

export function useIsOwner(): boolean {
  return useContext(RoleContext) === 'OWNER'
}
