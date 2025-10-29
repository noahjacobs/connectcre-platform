// Address normalization helper
export function normalizeAddress(address: string | null | undefined): string | null {
  if (!address) return null;

  // Convert to lowercase and remove all periods first
  let normalized = address.toLowerCase().replace(/\./g, '');

  // Normalize directional indicators (N, S, E, W)
  normalized = normalized
    .replace(/\b(north|n)\b/g, 'n')
    .replace(/\b(south|s)\b/g, 's')
    .replace(/\b(east|e)\b/g, 'e')
    .replace(/\b(west|w)\b/g, 'w');

  // Normalize street types (St, Ave, Rd, etc.)
  normalized = normalized
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(road|rd)\b/g, 'rd')
    .replace(/\b(boulevard|blvd)\b/g, 'blvd')
    .replace(/\b(drive|dr)\b/g, 'dr')
    .replace(/\b(lane|ln)\b/g, 'ln')
    .replace(/\b(place|pl)\b/g, 'pl')
    .replace(/\b(court|ct)\b/g, 'ct')
    .replace(/\b(circle|cir)\b/g, 'cir') // Added Circle
    .replace(/\b(terrace|ter)\b/g, 'ter') // Added Terrace
    .replace(/\b(parkway|pkwy)\b/g, 'pkwy') // Added Parkway
    .replace(/\b(square|sq)\b/g, 'sq'); // Added Square
    // Add more common replacements as needed

  // Remove commas and collapse multiple spaces, then trim
  return normalized
    .replace(/,/g, '')      // Remove commas
    .replace(/\s+/g, ' ')   // Collapse multiple spaces
    .trim();
} 