import * as THREE from 'three';

// Utility to create a procedural road texture
export function createRoadTexture(isDark: boolean, withLines: boolean = true): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base asphalt color
    ctx.fillStyle = isDark ? '#111116' : '#9999a0';
    ctx.fillRect(0, 0, 1024, 1024);

    // Add noise for asphalt texture
    for (let i = 0; i < 50000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const size = Math.random() * 2 + 1;
        const shade = isDark ? Math.random() * 40 : 100 + Math.random() * 100;
        ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.15)`;
        ctx.fillRect(x, y, size, size);
    }

    if (withLines) {
        // Outer edge lines (solid)
        ctx.fillStyle = isDark ? '#ffffff' : '#444444';
        ctx.fillRect(50, 0, 20, 1024);
        ctx.fillRect(1024 - 70, 0, 20, 1024);

        // Center dashed line
        ctx.fillStyle = '#ffcc00'; // Yellow center line
        for (let i = 0; i < 1024; i += 120) {
            ctx.fillRect(1024 / 2 - 15, i, 30, 60);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Utility to create a procedural building texture based on a project
export interface ProjectTheme {
    name: string;
    emoji: string;
    color: string;
    accent: string;
    windowColorBase: string;
    windowColorLit: string;
}

export const SOLANA_PROJECTS: ProjectTheme[] = [
    { name: 'TENSOR', emoji: '⚡', color: '#ffd600', accent: '#000000', windowColorBase: '#222', windowColorLit: '#ffea00' },
    { name: 'PHANTOM', emoji: '👻', color: '#ab9ff2', accent: '#ffffff', windowColorBase: '#332a66', windowColorLit: '#d5ccff' },
    { name: 'JUPITER', emoji: '🪐', color: '#16db65', accent: '#000000', windowColorBase: '#0a3a1f', windowColorLit: '#70ff9f' },
    { name: 'RAYDIUM', emoji: '💧', color: '#2b6aff', accent: '#0eeaff', windowColorBase: '#0b1b4d', windowColorLit: '#85ecff' },
    { name: 'MAGIC EDEN', emoji: '🪄', color: '#e839e5', accent: '#ffffff', windowColorBase: '#420b41', windowColorLit: '#ffa6fe' },
    { name: 'PYTH', emoji: '🔮', color: '#9e91ff', accent: '#ffffff', windowColorBase: '#1a1833', windowColorLit: '#d8ccff' }
];

export function createBuildingTexture(project: ProjectTheme, isDark: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base color
    ctx.fillStyle = isDark ? darkenColor(project.color, 0.4) : project.color;
    ctx.fillRect(0, 0, 512, 1024);

    // Draw Emoji / Logo area at the top
    ctx.fillStyle = project.accent;
    ctx.fillRect(0, 0, 512, 250);

    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(project.emoji, 256, 100);

    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = (project.accent === '#ffffff' || project.accent === '#0eeaff') ? '#000' : '#fff';
    ctx.fillText(project.name, 256, 180);

    // Draw windows
    const cols = 5;
    const rows = 12;
    const marginX = 40;
    const marginY = 40;
    const startY = 300;
    const windowW = (512 - marginX * 2) / cols - 10;
    const windowH = (1024 - startY - marginY) / rows - 10;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const isLit = Math.random() > (isDark ? 0.7 : 0.4);
            ctx.fillStyle = isLit ? project.windowColorLit : project.windowColorBase;

            // Outer glow if lit
            if (isLit) {
                ctx.shadowColor = project.windowColorLit;
                ctx.shadowBlur = 10;
            } else {
                ctx.shadowBlur = 0;
            }

            const vx = marginX + c * (windowW + 10);
            const vy = startY + r * (windowH + 10);
            ctx.fillRect(vx, vy, windowW, windowH);
        }
    }

    ctx.shadowBlur = 0; // reset

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Anisotropy could be set outside if needed
    return texture;
}

// Helper to darken hex
function darkenColor(hex: string, amount: number) {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    r = Math.floor(r * (1 - amount));
    g = Math.floor(g * (1 - amount));
    b = Math.floor(b * (1 - amount));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Ad Generator for truck
const AD_MESSAGES = [
    { text: "STAKE SWS!", bgColor: "#9945FF", fgColor: "#14F195" },
    { text: "BUY TENSOR", bgColor: "#ffd600", fgColor: "#000" },
    { text: "MOON INCOMING", bgColor: "#000", fgColor: "#14F195" },
    { text: "LIQUIDITY POOLS", bgColor: "#14F195", fgColor: "#000" }
];

export function createAdTexture(index: number = 0): THREE.CanvasTexture {
    const ad = AD_MESSAGES[index % AD_MESSAGES.length];
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = ad.bgColor;
    ctx.fillRect(0, 0, 512, 256);

    // Some simple designs
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(255,255,255,0.1)`;
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 100 + 50, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = ad.fgColor;
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ad.text, 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
