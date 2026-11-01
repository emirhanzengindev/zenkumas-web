# Zentekstil - Fabric Promotion and Management Website

## Project Structure

```
zenkumas-frontend/
│
├── index.html              # Main homepage
├── hakkimizda.html         # About us page
├── iletisim.html           # Contact page
├── kumaslar.html           # Fabrics listing page
├── giris.html              # Login page
├── kayit.html              # Registration page
├── admin/                  # Admin panel
│   ├── index.html          # Admin dashboard
│   └── duzenle.html        # Edit fabric page
├── assets/
│   ├── css/
│   │   └── styles.css      # Custom styles
│   ├── js/
│   │   ├── main.js         # Main JavaScript
│   │   └── admin.js        # Admin panel JavaScript
│   └── images/
│       └── logo.jpeg       # Company logo
├── components/
│   ├── header.html         # Header component
│   ├── footer.html         # Footer component
│   └── chatbot.html        # Chatbot component
└── README.md               # Project documentation
```

## Features Implementation

### 1. General Features
- ✅ Site Name: Zentekstil
- ✅ Fabric Types: 10 pieces (2 photos each)
- ✅ Database: Fabric information + photos stored in a table
- ✅ Menu: Logo – Homepage – Fabrics – About Us – Contact Us

### 2. Homepage
- ✅ Loops fabric photos + short descriptions
- ✅ Swiper slider for featured fabrics

### 3. Fabrics Page
- ✅ Fabric types list on the left
- ✅ Filter by clicking on fabric types
- ✅ Grid display of fabrics with images

### 4. Chat Bot
- ✅ Appears as a logo/widget
- ✅ Simple question and answer system
- ✅ Predefined responses for common questions

### 5. Admin Panel
- ✅ Fabric stock can be updated "yes/no"
- ✅ CRUD operations for fabrics
- ✅ Authentication system

### 6. About Us
- ✅ Text-only page with company information

### 7. Contact
- ✅ Phone, email, address information
- ✅ Contact form
- ✅ Map placeholder

### 8. User Authentication
- ✅ Login page
- ✅ Registration page
- ✅ User profile display

## Technology Stack
- HTML5
- CSS3 (TailwindCSS)
- JavaScript (Vanilla)
- SwiperJS (for sliders)
- LocalStorage (for simple data storage)

## Getting Started
1. Clone the repository
2. Open `index.html` in a browser
3. For development, use a local server (Live Server extension recommended)

## Deployment
Deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.)

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request