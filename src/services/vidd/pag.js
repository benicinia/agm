// ==============================================
// LOGIN/LOGOUT FUNCTIONALITY WITH GOOGLE LOGIN
// ==============================================

// State management
//let isLoggedIn = false;
//let userProfile = null;

// Template data
const templates = [
    {
        id: 1,
        title: 'YouTube Intro',
        category: 'social',
        tags: ['youtube', 'intro', 'animated'],
        preview: '🎬',
        color: 'linear-gradient(135deg, #ff6b6b, #f72585)'
    },
    {
        id: 2,
        title: 'Business Presentation',
        category: 'business',
        tags: ['corporate', 'slideshow', 'professional'],
        preview: '📊',
        color: 'linear-gradient(135deg, #4cc9f0, #4895ef)'
    },
    {
        id: 3,
        title: 'Instagram Story',
        category: 'social',
        tags: ['vertical', 'stories', 'trendy'],
        preview: '📱',
        color: 'linear-gradient(135deg, #f9c74f, #f9844a)'
    },
    {
        id: 4,
        title: 'Educational Video',
        category: 'education',
        tags: ['tutorial', 'explainer', 'classroom'],
        preview: '📚',
        color: 'linear-gradient(135deg, #90be6d, #43aa8b)'
    },
    {
        id: 5,
        title: 'Wedding Slideshow',
        category: 'events',
        tags: ['romantic', 'memories', 'photo'],
        preview: '💒',
        color: 'linear-gradient(135deg, #f8a5c2, #f78fb3)'
    },
    {
        id: 6,
        title: 'Gaming Montage',
        category: 'gaming',
        tags: ['gameplay', 'highlights', 'energetic'],
        preview: '🎮',
        color: 'linear-gradient(135deg, #a55eea, #8e44ad)'
    },
    {
        id: 7,
        title: 'Product Promo',
        category: 'business',
        tags: ['marketing', 'advertisement', 'product'],
        preview: '🏷️',
        color: 'linear-gradient(135deg, #f97f51, #f39c12)'
    },
    {
        id: 8,
        title: 'Vlog Intro',
        category: 'social',
        tags: ['personal', 'lifestyle', 'intro'],
        preview: '🎥',
        color: 'linear-gradient(135deg, #25a9e0, #00d2d3)'
    }
];

// Initialize the login functionality
function initLoginSystem() {
    createLoginModal();
    createLandingPage(); // Create landing page HTML
    setupEventListeners();
    updateHeaderMenu();
}

// Create landing page HTML
function createLandingPage() {
    // Check if landing page already exists
    if (document.getElementById('landingPage')) return;
    
    const landingHTML = `
        <div class="landing-page" id="landingPage" style="display: block;">
            <!-- Hero Section -->
            <div class="hero-section">
                <div class="hero-content">
                    <h1 class="hero-title">Create amazing videos with <span class="gradient-text">DART</span></h1>
                    <p class="hero-subtitle">Professional video editing tools for everyone. No experience needed.</p>
                    <div class="hero-buttons">
                        <button class="hero-btn primary" id="landingGetStartedBtn">
                            <span>🎬</span> Get Started Free
                        </button>
                        <button class="hero-btn secondary" id="landingWatchDemoBtn">
                            <span>▶</span> Watch Demo
                        </button>
                    </div>
                    <div class="hero-stats">
                        <div class="stat-item">
                            <span class="stat-number">10M+</span>
                            <span class="stat-label">Videos Created</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">4.8★</span>
                            <span class="stat-label">User Rating</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">100+</span>
                            <span class="stat-label">Templates</span>
                        </div>
                    </div>
                </div>
                <div class="hero-image">
                    <div class="hero-video-placeholder">
                        <div class="placeholder-content">
                            <span class="play-icon">▶</span>
                            <span>See DART in action</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Templates Section -->
            <div class="templates-section">
                <div class="section-header">
                    <h2>Start with a template</h2>
                    <p>Choose from hundreds of professionally designed templates</p>
                </div>
                
                <div class="template-categories">
                    <button class="category-btn active" data-category="all">All</button>
                    <button class="category-btn" data-category="social">Social Media</button>
                    <button class="category-btn" data-category="business">Business</button>
                    <button class="category-btn" data-category="education">Education</button>
                    <button class="category-btn" data-category="events">Events</button>
                    <button class="category-btn" data-category="gaming">Gaming</button>
                </div>

                <div class="templates-grid" id="templatesGrid"></div>

                <div class="section-footer">
                    <button class="browse-templates-btn" id="browseAllTemplatesBtn">
                        Browse All Templates <span>→</span>
                    </button>
                </div>
            </div>

            <!-- Features Section -->
            <div class="features-section">
                <div class="section-header">
                    <h2>Powerful features, simple interface</h2>
                    <p>Everything you need to create professional videos</p>
                </div>

                <div class="features-grid">
                    <div class="feature-card">
                        <div class="feature-icon">🎬</div>
                        <h3>Video Editing</h3>
                        <p>Trim, cut, split, and arrange clips with our intuitive timeline editor</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🎵</div>
                        <h3>Audio Analysis</h3>
                        <p>Auto-detect beats and sync your videos to music perfectly</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">✨</div>
                        <h3>Effects & Filters</h3>
                        <p>Add professional effects, transitions, and color grading</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">📝</div>
                        <h3>Text Overlays</h3>
                        <p>Create stunning titles, captions, and animated text</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🖼️</div>
                        <h3>Image Editor</h3>
                        <p>Crop, enhance, and remove backgrounds from images</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🚀</div>
                        <h3>Fast Export</h3>
                        <p>Export in 4K quality with hardware acceleration</p>
                    </div>
                </div>
            </div>

            <!-- How It Works Section -->
            <div class="how-it-works-section">
                <div class="section-header">
                    <h2>How it works</h2>
                    <p>Create your first video in 3 simple steps</p>
                </div>

                <div class="steps-container">
                    <div class="step-card">
                        <div class="step-number">1</div>
                        <div class="step-icon">📁</div>
                        <h3>Import Media</h3>
                        <p>Upload your videos, images, and audio files or choose from our library</p>
                    </div>
                    <div class="step-connector">→</div>
                    <div class="step-card">
                        <div class="step-number">2</div>
                        <div class="step-icon">✂️</div>
                        <h3>Edit & Customize</h3>
                        <p>Trim clips, add effects, sync to music, and arrange on timeline</p>
                    </div>
                    <div class="step-connector">→</div>
                    <div class="step-card">
                        <div class="step-number">3</div>
                        <div class="step-icon">📤</div>
                        <h3>Export & Share</h3>
                        <p>Export in high quality and share directly to social media</p>
                    </div>
                </div>
            </div>

            <!-- Testimonials Section -->
            <div class="testimonials-section">
                <div class="section-header">
                    <h2>Loved by creators worldwide</h2>
                    <p>Join millions of happy DART users</p>
                </div>

                <div class="testimonials-grid">
                    <div class="testimonial-card">
                        <div class="testimonial-rating">★★★★★</div>
                        <p class="testimonial-text">"Best free video editor I've ever used. The beat sync feature is incredible!"</p>
                        <div class="testimonial-author">
                            <div class="author-avatar">👤</div>
                            <div class="author-info">
                                <span class="author-name">Sarah Johnson</span>
                                <span class="author-title">Content Creator</span>
                            </div>
                        </div>
                    </div>
                    <div class="testimonial-card">
                        <div class="testimonial-rating">★★★★★</div>
                        <p class="testimonial-text">"Makes video editing so easy. My students love creating projects with DART."</p>
                        <div class="testimonial-author">
                            <div class="author-avatar">👤</div>
                            <div class="author-info">
                                <span class="author-name">Michael Chen</span>
                                <span class="author-title">Teacher</span>
                            </div>
                        </div>
                    </div>
                    <div class="testimonial-card">
                        <div class="testimonial-rating">★★★★★</div>
                        <p class="testimonial-text">"The template library saves me hours of work. Professional results every time."</p>
                        <div class="testimonial-author">
                            <div class="author-avatar">👤</div>
                            <div class="author-info">
                                <span class="author-name">Emma Rodriguez</span>
                                <span class="author-title">Social Media Manager</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CTA Section -->
            <div class="cta-section">
                <div class="cta-content">
                    <h2>Start creating amazing videos today</h2>
                    <p>No credit card required. Free forever.</p>
                    <button class="cta-btn" id="landingCtaBtn">
                        Get Started Free <span>→</span>
                    </button>
                </div>
            </div>
        </div>

        <style>
        /* Landing Page Styles */
        .landing-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: var(--text-primary);
        }

        /* Hero Section */
        .hero-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            padding: 60px 0;
            align-items: center;
        }

        .hero-content {
            animation: fadeInUp 0.6s ease;
        }

        .hero-title {
            font-size: 3.5rem;
            line-height: 1.2;
            margin-bottom: 20px;
            font-weight: 700;
        }

        .gradient-text {
            background: linear-gradient(45deg, #4cc9f0, #f72585);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .hero-subtitle {
            font-size: 1.2rem;
            color: var(--text-secondary);
            margin-bottom: 30px;
            line-height: 1.6;
        }

        .hero-buttons {
            display: flex;
            gap: 15px;
            margin-bottom: 40px;
        }

        .hero-btn {
            padding: 14px 28px;
            border: none;
            border-radius: 8px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }

        .hero-btn.primary {
            background: var(--accent-color);
            color: white;
        }

        .hero-btn.primary:hover {
            background: var(--accent-hover);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(94, 129, 172, 0.4);
        }

        .hero-btn.secondary {
            background: transparent;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
        }

        .hero-btn.secondary:hover {
            background: var(--tertiary-bg);
            transform: translateY(-2px);
        }

        .hero-stats {
            display: flex;
            gap: 40px;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
        }

        .stat-number {
            font-size: 1.8rem;
            font-weight: 700;
            color: var(--accent-color);
        }

        .stat-label {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        .hero-image {
            position: relative;
            animation: fadeInRight 0.6s ease;
        }

        .hero-video-placeholder {
            background: linear-gradient(135deg, var(--tertiary-bg), var(--secondary-bg));
            border-radius: 12px;
            padding: 56.25% 0 0 0;
            position: relative;
            overflow: hidden;
            border: 1px solid var(--border-color);
        }

        .placeholder-content {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }

        .play-icon {
            width: 60px;
            height: 60px;
            background: var(--accent-color);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .play-icon:hover {
            transform: scale(1.1);
            background: var(--accent-hover);
        }

        /* Templates Section */
        .templates-section {
            padding: 60px 0;
        }

        .section-header {
            text-align: center;
            margin-bottom: 40px;
        }

        .section-header h2 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .section-header p {
            color: var(--text-secondary);
            font-size: 1.1rem;
        }

        .template-categories {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .category-btn {
            padding: 10px 20px;
            background: var(--tertiary-bg);
            border: 1px solid var(--border-color);
            border-radius: 30px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .category-btn:hover,
        .category-btn.active {
            background: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
        }

        .templates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .template-card {
            background: var(--secondary-bg);
            border-radius: 10px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid var(--border-color);
        }

        .template-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
            border-color: var(--accent-color);
        }

        .template-preview {
            height: 160px;
           background: linear-gradient(135deg, var(--tertiary-bg), var(--primary-bg));
            
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
        }

        .template-info {
            padding: 15px;
        }

        .template-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .template-category {
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 8px;
            text-transform: capitalize;
        }

        .template-tags {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
        }

        .template-tag {
            font-size: 0.75rem;
            padding: 2px 8px;
            background: var(--tertiary-bg);
            border-radius: 12px;
            color: var(--text-secondary);
        }

        .section-footer {
            text-align: center;
        }

        .browse-templates-btn {
            padding: 12px 24px;
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        }

        .browse-templates-btn:hover {
            background: var(--tertiary-bg);
            border-color: var(--accent-color);
        }

        /* Features Section */
        .features-section {
            padding: 60px 0;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }

        .feature-card {
            background: var(--secondary-bg);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            transition: all 0.3s ease;
            border: 1px solid var(--border-color);
        }

        .feature-card:hover {
            transform: translateY(-5px);
            border-color: var(--accent-color);
        }

        .feature-icon {
            font-size: 2.5rem;
            margin-bottom: 20px;
        }

        .feature-card h3 {
            margin-bottom: 15px;
            font-size: 1.3rem;
        }

        .feature-card p {
            color: var(--text-secondary);
            line-height: 1.6;
        }

        /* How It Works Section */
        .how-it-works-section {
            padding: 60px 0;
        }

        .steps-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }

        .step-card {
            background: var(--secondary-bg);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            flex: 1;
            min-width: 250px;
            position: relative;
            border: 1px solid var(--border-color);
        }

        .step-number {
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            width: 30px;
            height: 30px;
            background: var(--accent-color);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }

        .step-icon {
            font-size: 2rem;
            margin: 20px 0;
        }

        .step-connector {
            font-size: 2rem;
            color: var(--text-secondary);
        }

        /* Testimonials Section */
        .testimonials-section {
            padding: 60px 0;
        }

        .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }

        .testimonial-card {
            background: var(--secondary-bg);
            padding: 30px;
            border-radius: 10px;
            border: 1px solid var(--border-color);
        }

        .testimonial-rating {
            color: #ffd700;
            font-size: 1.2rem;
            margin-bottom: 15px;
        }

        .testimonial-text {
            font-style: italic;
            margin-bottom: 20px;
            line-height: 1.6;
            color: var(--text-secondary);
        }

        .testimonial-author {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .author-avatar {
            width: 40px;
            height: 40px;
            background: var(--tertiary-bg);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
        }

        .author-info {
            display: flex;
            flex-direction: column;
        }

        .author-name {
            font-weight: 600;
        }

        .author-title {
            font-size: 0.85rem;
            color: var(--text-secondary);
        }

        /* CTA Section */
        .cta-section {
            padding: 80px 0;
        }

        .cta-content {
            background: linear-gradient(135deg, var(--secondary-bg), var(--tertiary-bg));
            padding: 60px;
            border-radius: 20px;
            text-align: center;
            border: 1px solid var(--border-color);
        }

        .cta-content h2 {
            font-size: 2.5rem;
            margin-bottom: 15px;
        }

        .cta-content p {
            color: var(--text-secondary);
            margin-bottom: 30px;
            font-size: 1.2rem;
        }

        .cta-btn {
            padding: 16px 32px;
            background: linear-gradient(45deg, var(--accent-color), var(--accent-hover));
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 1.2rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
        }

        .cta-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(94, 129, 172, 0.4);
        }

        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeInRight {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .hero-section {
                grid-template-columns: 1fr;
                gap: 30px;
                padding: 40px 0;
            }

            .hero-title {
                font-size: 2.5rem;
            }

            .hero-stats {
                justify-content: center;
            }

            .steps-container {
                flex-direction: column;
            }

            .step-connector {
                transform: rotate(90deg);
            }

            .cta-content {
                padding: 40px 20px;
            }

            .cta-content h2 {
                font-size: 2rem;
            }
        }

        @media (max-width: 480px) {
            .hero-title {
                font-size: 2rem;
            }

            .hero-buttons {
                flex-direction: column;
            }

            .hero-stats {
                flex-direction: column;
                gap: 20px;
                align-items: center;
            }

            .stat-item {
                align-items: center;
            }

            .section-header h2 {
                font-size: 2rem;
            }

            .template-categories {
                justify-content: flex-start;
                overflow-x: auto;
                padding-bottom: 10px;
            }
        }
        </style>
    `;
    
    // Insert landing page after header
    const header = document.querySelector('header');
    if (header) {
        header.insertAdjacentHTML('afterend', landingHTML);
    } else {
        document.querySelector('.container').insertAdjacentHTML('afterbegin', landingHTML);
    }
}

// Render templates based on category
function renderTemplates(category = 'all') {
    const grid = document.getElementById('templatesGrid');
    if (!grid) return;

    const filteredTemplates = category === 'all' 
        ? templates 
        : templates.filter(t => t.category === category);

    grid.innerHTML = filteredTemplates.map(template => `
        <div class="template-card" data-id="${template.id}" data-category="${template.category}">
            <div class="template-preview" style="background: ${template.color}">
                ${template.preview}
            </div>
            <div class="template-info">
                <div class="template-title">${template.title}</div>
                <div class="template-category">${template.category}</div>
                <div class="template-tags">
                    ${template.tags.map(tag => `<span class="template-tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');

    // Add click handlers to template cards
    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            if (!isLoggedIn) {
                showLoginModal();
            } else {
                alert('Template would be loaded into editor');
            }
        });
    });
}

// Setup landing page event listeners
function setupLandingEventListeners() {
    // Category filter buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTemplates(btn.dataset.category);
        });
    });

    // Get started buttons
    const getStartedBtns = [
        'landingGetStartedBtn',
        'landingCtaBtn'
    ];

    getStartedBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                if (!isLoggedIn) {
                    showLoginModal();
                }
            });
        }
    });

    // Watch demo button
    const watchDemoBtn = document.getElementById('landingWatchDemoBtn');
    if (watchDemoBtn) {
        watchDemoBtn.addEventListener('click', () => {
            alert('Demo video would play here');
        });
    }

    // Browse all templates button
    const browseBtn = document.getElementById('browseAllTemplatesBtn');
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            document.querySelector('.templates-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        });
    }
}

// Show/hide landing page based on login state
function toggleLandingPage(show) {
    const landingPage = document.getElementById('landingPage');
    const mainLayout = document.querySelector('.main-layout');
    const uploadSection = document.querySelector('.upload-section');
    
    if (landingPage) {
        landingPage.style.display = show ? 'block' : 'none';
    }
    
    if (mainLayout) {
        mainLayout.style.display = show ? 'none' : 'flex';
    }
    
    if (uploadSection) {
        uploadSection.style.display = show ? 'none' : 'block';
    }
}

// Placeholder functions that need to be defined
function createLoginModal() {
    // This function should create the login modal
    console.log('Creating login modal...');
    
    // Check if modal already exists
    if (document.getElementById('loginModal')) return;
    
    const loginModalHTML = `
        <div id="loginModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; align-items: center; justify-content: center;">
            <div style="background: var(--secondary-bg); padding: 40px; border-radius: 10px; max-width: 400px; width: 90%;">
                <h2 style="margin-bottom: 30px;">Login to DART</h2>
                <button id="googleLoginBtn" style="width: 100%; padding: 15px; background: white; color: #333; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <img src="https://www.google.com/favicon.ico" style="width: 20px; height: 20px;"> Continue with Google
                </button>
                <button id="closeLoginModal" style="width: 100%; padding: 10px; margin-top: 20px; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); border-radius: 5px; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loginModalHTML);
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function handleGoogleLogin() {
    // This function should handle Google login
    console.log('Handling Google login...');
    isLoggedIn = true;
    userProfile = { name: 'User', email: 'user@example.com' };
    hideLoginModal();
    updateHeaderMenu();
    toggleLandingPage(false);
}

function handleLogout() {
    // This function should handle logout
    console.log('Handling logout...');
    isLoggedIn = false;
    userProfile = null;
    updateHeaderMenu();
    toggleLandingPage(true);
}

function updateHeaderMenu() {
    // This function should update the header menu based on login state
    console.log('Updating header menu...');
    const loggedInMenu = document.getElementById('loggedInMenu');
    const loggedOutMenu = document.getElementById('loggedOutMenu');
    const renderBtn = document.getElementById('renderBtn');
    
    if (isLoggedIn) {
        if (loggedInMenu) loggedInMenu.style.display = 'flex';
        if (loggedOutMenu) loggedOutMenu.style.display = 'none';
        if (renderBtn) renderBtn.innerHTML = '🎬 Render Video';
    } else {
        if (loggedInMenu) loggedInMenu.style.display = 'none';
        if (loggedOutMenu) loggedOutMenu.style.display = 'flex';
        if (renderBtn) renderBtn.innerHTML = '🎬 Login';
    }
}

function setupEventListeners() {
    // Setup Google login button
    document.addEventListener('click', (e) => {
        if (e.target.id === 'googleLoginBtn') {
            handleGoogleLogin();
        } else if (e.target.id === 'closeLoginModal') {
            hideLoginModal();
        } else if (e.target.id === 'renderBtn') {
            if (!isLoggedIn) {
                showLoginModal();
            } else {
                alert('Starting video render...');
            }
        } else if (e.target.id === 'playPauseBtn') {
            // Handle play/pause
            const btn = document.getElementById('playPauseBtn');
            if (btn.innerHTML.includes('▶')) {
                btn.innerHTML = '⏸ Pause';
            } else {
                btn.innerHTML = '▶ Play';
            }
        }
    });
}

function checkSavedSession() {
    // Check for saved session (would check localStorage/cookies in real implementation)
    console.log('Checking saved session...');
    // For demo, start logged out
    isLoggedIn = false;
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Create landing page
    createLandingPage();
    
    // Create login modal
    createLoginModal();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for saved session
    checkSavedSession();
    
    // Update header menu
    updateHeaderMenu();
    
    // Render templates
    renderTemplates('all');
    
    // Setup landing page event listeners
    setupLandingEventListeners();
    
    // Initially show landing page if not logged in
    if (!isLoggedIn) {
        toggleLandingPage(true);
    }
});

// Export functions for external use
window.loginSystem = {
    login: showLoginModal,
    logout: handleLogout,
    isLoggedIn: () => isLoggedIn,
    getUserProfile: () => userProfile
};