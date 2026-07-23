// Substitutes {role} tokens from a role→value map. Uses a CALLBACK replacement
// (() => value) so a free-entered player name containing $&, $`, $', or $$ is
// inserted literally instead of being interpreted as replacement-string syntax.
export function formatNarrativeText(text: string, tokens: Record<string, string>): string {
  let result = text;
  for (const [role, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(`\\{${role}\\}`, 'g'), () => value);
  }
  return result;
}
