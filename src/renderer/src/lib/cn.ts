type ClassValue = string | number | boolean | undefined | null | ClassValue[]

function flatten(arr: ClassValue[]): string[] {
  return arr.flatMap((v) => {
    if (!v) return []
    if (Array.isArray(v)) return flatten(v)
    return [String(v)]
  })
}

export function cn(...inputs: ClassValue[]): string {
  return flatten(inputs).join(' ')
}
