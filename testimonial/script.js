document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.profile-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate rotation based on cursor position relative to center
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg rotation
            const rotateY = ((x - centerX) / centerX) * 10;

            // Update Custom Properties for Spotlight
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);

            // Apply 3D Transform
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            // Reset state
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            card.style.setProperty('--mouse-x', '50%');
            card.style.setProperty('--mouse-y', '50%');
        });
    });
});

// Interactive 3D Background - Warp Engine
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let particlesArray = [];
let warpSpeed = 0;
let warpActive = false;

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


class Star {
    constructor() {
        this.x = Math.random() * canvas.width - canvas.width / 2;
        this.y = Math.random() * canvas.height - canvas.height / 2;
        this.z = Math.random() * canvas.width; // Depth
        this.size = Math.random() * 2;
        this.color = Math.random() > 0.8 ? 'var(--accent-color)' : '#ffffff';
        
        // Fast Dynamic Drift Velocity (More "active" lightning)
        this.vx = (Math.random() - 0.5) * 1.5; // Increased speed
        this.vy = (Math.random() - 0.5) * 1.5;
        
        // Save initial positions for rotation calculation
        this.initialX = this.x;
        this.initialY = this.y;
    }

    update() {
        // Move star closer to camera (decrease Z)
        // Eased Acceleration for Warp
        let targetSpeed = warpActive ? 50 : 0.5;
        
        this.z -= (0.5 + warpSpeed);
        
        // Apply Drift (The "Moving Sticks" Effect)
        if (!warpActive) {
            this.initialX += this.vx;
            this.initialY += this.vy;
            
            // Boundary checks for drift
            if(this.initialX > canvas.width/2 || this.initialX < -canvas.width/2) this.vx *= -1;
            if(this.initialY > canvas.height/2 || this.initialY < -canvas.height/2) this.vy *= -1;
        }

        // Reset if passed camera
        if (this.z <= 1) {
            this.z = canvas.width;
            this.initialX = Math.random() * canvas.width - canvas.width / 2;
            this.initialY = Math.random() * canvas.height - canvas.height / 2;
            this.x = this.initialX;
            this.y = this.initialY;
            this.prevZ = this.z; // Reset trail
        }
        
        // 3D Rotation Logic (Mouse Parallax) WITH Continuous Spin
        // Continuous Global Rotation (The "Animation" Effect)
        let time = Date.now() * 0.0003; // Faster continuous spin
        
        // Mix mouse influence with auto-spin
        let rotX = (mouse.y != null ? (mouse.y - canvas.height / 2) * 0.0005 : 0) + (time * 0.2);
        let rotY = (mouse.x != null ? (mouse.x - canvas.width / 2) * 0.0005 : 0) + time;
        
        // Rotate around Y axis
        let cosY = Math.cos(rotY);
        let sinY = Math.sin(rotY);
        let rx = this.initialX * cosY - this.z * sinY;
        let rz = this.z * cosY + this.initialX * sinY;
        
        // Rotate around X axis
        let cosX = Math.cos(rotX);
        let sinX = Math.sin(rotX);
        let ry = this.initialY * cosX - rz * sinX;
        let finalZ = rz * cosX + this.initialY * sinX;
        
        this.x = rx;
        this.y = ry;
        // Use rotated Z for projection, but keep original Z for star cycle logic
        // We need a specific 'projectedZ' for drawing
        this.projectedZ = finalZ; 
    }

    draw() {
        // Safe check for Z to prevent division by zero or negative flip
        if (this.projectedZ <= 0) return;

        // Perspective Projection
        let sx = (this.x / this.projectedZ) * canvas.width + canvas.width / 2;
        let sy = (this.y / this.projectedZ) * canvas.height + canvas.height / 2;
        
        // Scale size by proximity
        let r = (canvas.width / this.projectedZ) * this.size * 0.5;
        
        ctx.beginPath();
        ctx.fillStyle = this.color == 'var(--accent-color)' ? '#7c4dff' : '#fff';
        
        if (warpActive) {
            // Draw Trails (Warp Lines)
            // Calculate previous position based on straight movement
            let prevZ_World = this.projectedZ + (warpSpeed * 5); // Trail length
            let px = (this.x / prevZ_World) * canvas.width + canvas.width / 2;
            let py = (this.y / prevZ_World) * canvas.height + canvas.height / 2;
            
            ctx.lineWidth = r;
            ctx.strokeStyle = ctx.fillStyle;
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.stroke();
        } else {
            // Draw Idle Dots
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function init() {
    particlesArray = [];
    let numberOfParticles = 200; // Reduced for performance with connections
    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Star());
    }
}

// 3D Connection (Lightning Effect)
function connect() {
    // Only connect in idle mode or if user wants lightning
    if (warpActive) return; 

    let opacityValue = 1;
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            // Check 3D Distance (Approximate using projected coords for visual "connection")
            // Visual connection is better for "lightning" checking distance on screen
            
            // Skip if behind camera
            if (particlesArray[a].projectedZ <= 0 || particlesArray[b].projectedZ <= 0) continue;

            let pA = particlesArray[a];
            let pB = particlesArray[b];

            // Real 3D distance check would be heavy, let's look for Screen Proximity for "constellation" look
            let sxA = (pA.x / pA.projectedZ) * canvas.width + canvas.width / 2;
            let syA = (pA.y / pA.projectedZ) * canvas.height + canvas.height / 2;
            let sxB = (pB.x / pB.projectedZ) * canvas.width + canvas.width / 2;
            let syB = (pB.y / pB.projectedZ) * canvas.height + canvas.height / 2;

            let dx = sxA - sxB;
            let dy = syA - syB;
            let distance = dx * dx + dy * dy;

            if (distance < 20000) { // Connection threshold
                opacityValue = 1 - (distance / 20000);
                
                // Deep space fade
                let depthFade = 1 - (pA.projectedZ / canvas.width);
                opacityValue *= depthFade;

                if(opacityValue > 0) {
                    ctx.beginPath();
                    // "Lightning" Color - BRIGHTER
                    ctx.strokeStyle = `rgba(140, 100, 255, ${opacityValue})`; 
                    ctx.lineWidth = 1; // Thicker lines
                    ctx.moveTo(sxA, syA);
                    ctx.lineTo(sxB, syB);
                    ctx.stroke();
                }
            }
        }
    }
}

function animate() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Trails effect for background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Smooth Warp Acceleration
    if(warpActive) {
        // Ease In Exponentially
        warpSpeed += (50 - warpSpeed) * 0.05;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        warpSpeed += (0 - warpSpeed) * 0.1;
    }

    particlesArray.forEach(star => {
        star.update();
        star.draw();
    });
    
    connect(); // Draw Lightning Connections
    
    if (document.body.classList.contains('loaded')) return; // Stop when done
    requestAnimationFrame(animate);
}

// Magnetic Buttons (Proximity Effect) & Global Mouse Tracker
const socialBtns = document.querySelectorAll('.social-btn');
let mouse = { x: null, y: null };

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    // Update Custom Cursor Immediately
    if (document.body.classList.contains('loaded')) {
        const cursor = document.querySelector('.cursor');
        if(cursor) {
            cursor.style.left = mouse.x + 'px';
            cursor.style.top = mouse.y + 'px';
        }
    }
});

function updateMagneticButtons() {
    socialBtns.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        if (mouse.x === null || mouse.y === null) return;

        const distX = mouse.x - centerX;
        const distY = mouse.y - centerY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        const threshold = 70; // Attraction range in pixels

        if (distance < threshold) {
            const strength = 0.5;
            btn.style.transform = `translate(${distX * strength}px, ${distY * strength}px)`;
        } else {
            btn.style.transform = 'translate(0, 0)';
        }
    });
    requestAnimationFrame(updateMagneticButtons);
}
updateMagneticButtons();

// Typing Animation
class TypeWriter {
    constructor(el, roles, wait = 3000) {
        this.el = el;
        this.roles = roles;
        this.wait = parseInt(wait, 10);
        this.txt = '';
        this.roleIndex = 0;
        this.isDeleting = false;
        this.type();
    }

    type() {
        const current = this.roleIndex % this.roles.length;
        const fullTxt = this.roles[current];

        if (this.isDeleting) {
            this.txt = fullTxt.substring(0, this.txt.length - 1);
        } else {
            this.txt = fullTxt.substring(0, this.txt.length + 1);
        }

        this.el.innerHTML = this.txt; 

        let typeSpeed = 200;
        if (this.isDeleting) typeSpeed /= 2;

        if (!this.isDeleting && this.txt === fullTxt) {
            typeSpeed = this.wait;
            this.isDeleting = true;
        } else if (this.isDeleting && this.txt === '') {
            this.isDeleting = false;
            this.roleIndex++;
            typeSpeed = 500;
        }

        setTimeout(() => this.type(), typeSpeed);
    }
}

// Init Typing
document.querySelectorAll('.profile-role').forEach(roleEl => {
    const roles = JSON.parse(roleEl.getAttribute('data-roles'));
    new TypeWriter(roleEl, roles);
});

// Custom Cursor Follower Logic
const follower = document.querySelector('.cursor-follower');
let posX = 0, posY = 0;

function updateFollower() {
    // Only update if content is loaded (cursor visible)
    if (document.body.classList.contains('loaded')) {
        posX += (mouse.x - posX) / 9;
        posY += (mouse.y - posY) / 9;
        
        if(follower) {
            follower.style.left = posX + 'px';
            follower.style.top = posY + 'px';
        }
    }
    requestAnimationFrame(updateFollower);
}
updateFollower();

// Hover States
const hoverTargets = document.querySelectorAll('a, button, .profile-card, .social-btn');
hoverTargets.forEach(target => {
    target.addEventListener('mouseenter', () => {
        if(document.body.classList.contains('loaded')) {
            document.body.classList.add('cursor-hover');
        }
    });
    target.addEventListener('mouseleave', () => {
        document.body.classList.remove('cursor-hover');
    });
});

// Audio UI (Synthesizer)
class AudioFX {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Increased volume
        this.masterGain.connect(this.ctx.destination);
    }

    playTone(freq, type, duration) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                console.log('AudioContext resumed');
            });
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.connect(this.masterGain);
        osc.connect(gain);
        
        osc.start();
        
        // ADSR Envelope
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        
        osc.stop(this.ctx.currentTime + duration);
    }

    playHover() {
        console.log('Playing hover sound'); // Debug log
        this.playTone(800, 'sine', 0.1);
        setTimeout(() => this.playTone(1200, 'triangle', 0.05), 50);
    }

    playClick() {
        console.log('Playing click sound'); // Debug log
        this.playTone(300, 'square', 0.1);
    }
    
    playPowerUp() {
        console.log('Playing power up sound'); // Debug log
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        // Bass Drop / Impact
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 1);
        
        gain.connect(this.masterGain);
        osc.connect(gain);
        
        osc.start();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1);
        osc.stop(this.ctx.currentTime + 1);

        // High frequency charge up
        this.playTone(800, 'sine', 0.2);
        setTimeout(() => this.playTone(1500, 'square', 0.1), 100);
    }
}

const sfx = new AudioFX();

// attach sound to elements
document.querySelectorAll('a, button, .profile-card').forEach(el => {
    el.addEventListener('mouseenter', () => sfx.playHover());
    el.addEventListener('click', () => sfx.playClick());
});

// Interactive Splash Screen Logic
const startBtn = document.getElementById('start-btn');
const splash = document.getElementById('splash-screen');

if (startBtn) {
    startBtn.addEventListener('click', () => {
        // 1. Play Sound
        sfx.playPowerUp();
        
        // 2. Start Animation & Warp
        splash.classList.add('animating');
        warpActive = true; 
        
        // 3. Cleanup
        setTimeout(() => {
            splash.classList.add('hidden');
            document.body.classList.add('loaded'); // This enables the custom cursor
        }, 1500);
    });
}

// Modal Logic
const modal = document.getElementById('profile-modal');
const closeModal = document.querySelector('.close-modal');
const modalName = document.querySelector('.modal-name');
const modalRole = document.querySelector('.modal-role');
const modalImg = document.querySelector('.modal-image');

if (modal) {
    document.querySelectorAll('.profile-card').forEach(card => {
        card.addEventListener('click', () => {
            const name = card.querySelector('.profile-name').innerText;
            const role = card.querySelector('.profile-role').innerText;
            const img = card.querySelector('.profile-image').src;

            modalName.innerText = name;
            modalRole.innerText = role;
            modalImg.src = img;

            modal.classList.add('active');
        });
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

// --- Navigation Logic ---
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const links = document.querySelectorAll('.nav-link');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Close nav when link is clicked
links.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// Highlight active link on scroll (ScrollSpy)
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    links.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
            link.classList.add('active');
        }
    });
});

// --- Stats Counter Animation ---
const statsSection = document.querySelector('#stats');
const statNumbers = document.querySelectorAll('.stat-number');
let started = false;

window.addEventListener('scroll', () => {
    if (statsSection && window.scrollY >= statsSection.offsetTop - 500) {
        if (!started) {
            statNumbers.forEach(num => startCount(num));
        }
        started = true;
    }
});

function startCount(el) {
    const target = parseInt(el.dataset.target);
    const count = setInterval(() => {
        const current = parseInt(el.innerText);
        const increment = Math.ceil(target / 50); // Speed of count
        
        if (current < target) {
            el.innerText = current + increment;
        } else {
            el.innerText = target;
            clearInterval(count);
        }
    }, 40);
}

// --- Contact Form Handling ---
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Simulate sending
        const btn = contactForm.querySelector('.submit-btn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = 'Sending... <i class="fa-solid fa-spinner fa-spin"></i>';
        
        setTimeout(() => {
            btn.innerHTML = 'Message Sent! <i class="fa-solid fa-check"></i>';
            btn.style.background = '#00c853';
            contactForm.reset();
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = 'var(--accent-color)';
            }, 3000);
        }, 1500);
    });
}
