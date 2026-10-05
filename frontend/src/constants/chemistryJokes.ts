/**
 * The chemistry jokes from soc.ankerd.nl, shown under the message on every
 * error screen. Keep in step with the list in `public/boot-guard.js`, which
 * has to be plain ES5 and so can't import this.
 */
export const CHEMISTRY_JOKES: readonly string[] = [
  "Waarom heeft de bioloog het uitgemaakt met de natuurkundige? Ze hadden geen chemie.",
  "Waar zijn de virussen gebleven? Ze griep weg.",
  'Een heliumatoom loopt een bar binnen. De barman zegt: "Sorry, we schenken geen edelgas." Het heliumatoom reageert niet.',
  "Wat gebeurt er als elektronen hun energie verliezen? Ze krijgen Bohr'ed.",
  "Waarom maakte de fractie zich zorgen over het trouwen met de komma? Omdat hij zich zou moeten bekeren.",
  "Wat is het favoriete type wiskunde van een vogel? OWL-gebra.",
  "Waarom was de meetkundeleraar niet op school? Omdat ze haar hoek verstuikte!!",
  "Waarom loste de ijsbeer op in water? Omdat hij polair was!",
  "Wat moet je doen met een dode scheikundige? Barium!",
];

export function pickJoke(random: () => number = Math.random): string {
  return CHEMISTRY_JOKES[Math.floor(random() * CHEMISTRY_JOKES.length)];
}
