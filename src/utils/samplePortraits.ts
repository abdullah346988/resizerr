import { PhotoItem } from '../types';

export function createSamplePortraitFiles(): Promise<File[]> {
  const samples = [
    {
      name: 'applicant_alex_chen.jpg',
      bg: '#e8f0fe',
      skin: '#e0a97a',
      hair: '#1e293b',
      shirt: '#1e3a8a',
      eyes: '#334155',
      glasses: false,
      title: 'Alex Chen'
    },
    {
      name: 'applicant_sarah_miller.jpg',
      bg: '#f8fafc',
      skin: '#fbd7b2',
      hair: '#854d0e',
      shirt: '#047857',
      eyes: '#1e293b',
      glasses: true,
      title: 'Sarah Miller'
    },
    {
      name: 'applicant_marcus_adebayo.jpg',
      bg: '#f1f5f9',
      skin: '#78350f',
      hair: '#0f172a',
      shirt: '#475569',
      eyes: '#0f172a',
      glasses: false,
      title: 'Marcus Adebayo'
    },
    {
      name: 'applicant_priya_patel.jpg',
      bg: '#f0fdf4',
      skin: '#c28859',
      hair: '#171717',
      shirt: '#7c2d12',
      eyes: '#262626',
      glasses: false,
      title: 'Priya Patel'
    }
  ];

  return Promise.all(
    samples.map((s) => {
      return new Promise<File>((resolve) => {
        const width = 800;
        const height = 1000;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Background
        ctx.fillStyle = s.bg;
        ctx.fillRect(0, 0, width, height);

        // Soft vignette / gradient for natural photography feel
        const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.8);
        bgGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
        bgGrad.addColorStop(1, 'rgba(0,0,0,0.06)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Torso / Shoulders
        ctx.fillStyle = s.shirt;
        ctx.beginPath();
        ctx.ellipse(width / 2, height + 40, width * 0.44, height * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // Collar
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(width / 2 - 70, height * 0.68);
        ctx.lineTo(width / 2, height * 0.77);
        ctx.lineTo(width / 2 + 70, height * 0.68);
        ctx.closePath();
        ctx.fill();

        // Neck
        ctx.fillStyle = s.skin;
        ctx.beginPath();
        ctx.rect(width / 2 - 55, height * 0.52, 110, 160);
        ctx.fill();

        // Neck shadow
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.ellipse(width / 2, height * 0.55, 60, 20, 0, 0, Math.PI);
        ctx.fill();

        // Head / Face
        ctx.fillStyle = s.skin;
        ctx.beginPath();
        ctx.ellipse(width / 2, height * 0.4, 150, 190, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hair (back & top)
        ctx.fillStyle = s.hair;
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.36, 165, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        // Left eye
        ctx.beginPath();
        ctx.ellipse(width / 2 - 50, height * 0.39, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Right eye
        ctx.beginPath();
        ctx.ellipse(width / 2 + 50, height * 0.39, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = s.eyes;
        ctx.beginPath();
        ctx.arc(width / 2 - 50, height * 0.39, 8, 0, Math.PI * 2);
        ctx.arc(width / 2 + 50, height * 0.39, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrows
        ctx.strokeStyle = s.hair;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(width / 2 - 50, height * 0.36, 22, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(width / 2 + 50, height * 0.36, 22, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();

        // Nose
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(width / 2, height * 0.38);
        ctx.lineTo(width / 2, height * 0.45);
        ctx.lineTo(width / 2 - 12, height * 0.465);
        ctx.stroke();

        // Mouth (neutral passport expression)
        ctx.strokeStyle = '#9f1239';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 32, height * 0.515);
        ctx.lineTo(width / 2 + 32, height * 0.515);
        ctx.stroke();

        // Glasses if enabled
        if (s.glasses) {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 4;
          // Left frame
          ctx.strokeRect(width / 2 - 75, height * 0.36, 50, 32);
          // Right frame
          ctx.strokeRect(width / 2 + 25, height * 0.36, 50, 32);
          // Bridge
          ctx.beginPath();
          ctx.moveTo(width / 2 - 25, height * 0.38);
          ctx.lineTo(width / 2 + 25, height * 0.38);
          ctx.stroke();
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], s.name, { type: 'image/jpeg' });
              resolve(file);
            }
          },
          'image/jpeg',
          0.92
        );
      });
    })
  );
}
