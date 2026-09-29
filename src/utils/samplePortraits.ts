export function createSvgPortrait(s: {
  bg: string;
  skin: string;
  hair: string;
  shirt: string;
  eyes: string;
  glasses: boolean;
}): string {
  const glassesSvg = s.glasses
    ? `<rect x="325" y="360" width="50" height="32" rx="4" fill="none" stroke="#334155" stroke-width="4"/>
       <rect x="425" y="360" width="50" height="32" rx="4" fill="none" stroke="#334155" stroke-width="4"/>
       <line x1="375" y1="376" x2="425" y2="376" stroke="#334155" stroke-width="4"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <!-- Passport Photo Background -->
  <rect id="bg" class="passport-bg" width="100%" height="100%" fill="${s.bg}"/>
  
  <!-- Torso / Shoulders -->
  <ellipse cx="400" cy="1040" rx="352" ry="420" fill="${s.shirt}"/>
  
  <!-- Collar -->
  <polygon points="330,680 400,770 470,680" fill="#ffffff"/>
  
  <!-- Neck -->
  <rect x="345" y="520" width="110" height="160" fill="${s.skin}"/>
  <ellipse cx="400" cy="550" rx="60" ry="20" fill="rgba(0,0,0,0.12)"/>
  
  <!-- Face / Head -->
  <ellipse cx="400" cy="400" rx="150" ry="190" fill="${s.skin}"/>
  
  <!-- Hair -->
  <path d="M 235,400 A 165,165 0 1,1 565,400 Q 500,260 400,260 Q 300,260 235,400 Z" fill="${s.hair}"/>
  
  <!-- Eyes -->
  <ellipse cx="350" cy="390" rx="18" ry="10" fill="#ffffff"/>
  <ellipse cx="450" cy="390" rx="18" ry="10" fill="#ffffff"/>
  <circle cx="350" cy="390" r="8" fill="${s.eyes}"/>
  <circle cx="450" cy="390" r="8" fill="${s.eyes}"/>
  
  <!-- Eyebrows -->
  <path d="M 330,365 Q 350,355 370,365" stroke="${s.hair}" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M 430,365 Q 450,355 470,365" stroke="${s.hair}" stroke-width="5" stroke-linecap="round" fill="none"/>
  
  <!-- Nose -->
  <path d="M 400,380 L 400,450 L 388,465" stroke="rgba(0,0,0,0.25)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  
  <!-- Mouth -->
  <line x1="368" y1="515" x2="432" y2="515" stroke="#9f1239" stroke-width="4" stroke-linecap="round"/>
  
  ${glassesSvg}
</svg>`;
}

export function createSamplePortraitFiles(): Promise<File[]> {
  const samples = [
    {
      name: 'applicant_alex_chen.svg',
      bg: '#e8f0fe',
      skin: '#e0a97a',
      hair: '#1e293b',
      shirt: '#1e3a8a',
      eyes: '#334155',
      glasses: false,
      title: 'Alex Chen'
    },
    {
      name: 'applicant_sarah_miller.svg',
      bg: '#f8fafc',
      skin: '#fbd7b2',
      hair: '#854d0e',
      shirt: '#047857',
      eyes: '#1e293b',
      glasses: true,
      title: 'Sarah Miller'
    },
    {
      name: 'applicant_marcus_adebayo.svg',
      bg: '#f1f5f9',
      skin: '#78350f',
      hair: '#0f172a',
      shirt: '#475569',
      eyes: '#0f172a',
      glasses: false,
      title: 'Marcus Adebayo'
    },
    {
      name: 'applicant_priya_patel.svg',
      bg: '#f0fdf4',
      skin: '#c28859',
      hair: '#171717',
      shirt: '#7c2d12',
      eyes: '#262626',
      glasses: false,
      title: 'Priya Patel'
    }
  ];

  return Promise.resolve(
    samples.map((s) => {
      const svgText = createSvgPortrait(s);
      return new File([svgText], s.name, { type: 'image/svg+xml' });
    })
  );
}
