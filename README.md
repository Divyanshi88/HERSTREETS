# HerStreet

> Know how a place feels before you get there.

HerStreet is a community-powered urban comfort mapping platform designed to help women make more informed everyday travel decisions.

Unlike traditional navigation applications that primarily recommend the fastest route, HerStreet aims to compare walking routes using practical factors such as lighting, street activity, transport access, pavement conditions, nearby essential services, and the freshness of community reports.

## Project Status

HerStreet is currently under development. Phase 1 establishes the branded, responsive landing experience and preserves the existing GraphHopper/OpenLayers routing flow. Community reporting and comfort scoring remain future phases.

The first version is being designed as a small neighbourhood pilot. It will cover residential streets and nearby locations such as transport connections, healthcare facilities, petrol stations, places of worship, shops, and other frequently visited public places.

The pilot area will remain approximate to protect the creator’s private location.

## The Problem

Traditional navigation applications can answer:

- How long will a journey take?
- What is the shortest route?
- Where is the nearest shop or hospital?

However, they usually cannot answer:

- Is this street well lit in the evening?
- Does the area remain active at night?
- Are shops currently open along the route?
- Is public transport easily available?
- Is the pavement suitable for walking?
- Is the available information recent and reliable?

HerStreet aims to make this practical local knowledge visible.

## Core Idea

A user selects a destination, travel time, and personal comfort preferences. HerStreet then compares alternative walking routes.

Possible route options may include:

- Fastest route
- More comfortable route
- Most recently documented route

Each recommendation will include both a comfort score and a data-confidence level.

Example:

- Comfort score: 82/100
- Data confidence: Medium
- Reason: Better lighting reports, active shops, and nearby transport access
- Latest community verification: Four days ago

HerStreet provides information, not a guarantee of personal safety.

## Initial Report Categories

### 1. Lighting and Visibility

- Well lit
- Partially lit
- Poorly lit
- Clear visibility
- Obstructed visibility

### 2. Street Activity

- Busy
- Moderately active
- Quiet
- Isolated
- Shops or facilities currently open

### 3. Transport Access

- Airport access
- Bus availability
- Taxi or auto availability
- Pickup and drop-off points
- Walkable transport connections

### 4. Essential Help Nearby

- Hospital or clinic
- Pharmacy
- Staffed petrol station
- Police or emergency facility

### 5. Public and Community Places

- Place of worship
- Park
- Public toilet
- Seating or waiting area
- Drinking water

### 6. Walking Conditions

- Good pavement
- Broken or missing pavement
- Difficult road crossing
- Heavy traffic
- Construction or obstruction
- Stroller or wheelchair suitability

## Planned MVP

The first working version of HerStreet will allow users to:

1. View an interactive map
2. Search for a location
3. Select a travel time
4. Submit a condition report at a map location
5. View recent community reports
6. Filter reports by category
7. View a comfort heat map
8. Compare alternative walking routes
9. See comfort and confidence scores
10. Read an explanation of why a route was recommended

## Planned Comfort Model

HerStreet will initially use a transparent, rule-based scoring model rather than an unexplained machine-learning prediction.

A report’s influence may depend on:

- Report recency
- Community agreement
- Contributor reliability
- Available supporting evidence
- Time of day
- Number of reports in the area

Older reports will gradually lose influence so that outdated observations do not permanently define a location.

The application will keep these values separate:

- **Comfort score:** What recent observations suggest about the route
- **Confidence score:** How much reliable data is available

## Planned AI and Data Science

Future development may include:

- Community-report classification
- Duplicate-report detection
- Suspicious-report detection
- Street-image analysis
- Geospatial clustering
- Time-series analysis
- Report-confidence modelling
- Route scoring
- AI-generated route explanations
- Summaries of recent local conditions

AI-generated explanations must be grounded in available reports and geographic data. The system must not invent safety information.

## Privacy and Responsible Design

HerStreet is intended to support informed decisions while respecting user privacy.

The project will follow these principles:

- Never display a user’s live location publicly
- Avoid storing unnecessary movement history
- Keep the pilot location approximate
- Remove identifying metadata from uploaded photographs
- Provide controls for deleting user reports
- Moderate harassment and reports targeting individuals
- Describe observable conditions rather than labelling neighbourhoods
- Clearly communicate missing or outdated information
- Never guarantee that a route is safe
- Avoid crime prediction and profiling

## Technology

### Current Foundation

- React
- TypeScript
- OpenLayers
- Webpack
- GraphHopper routing integration
- OpenStreetMap-based geographic data
- Responsive HerStreet landing experience
- Landing-to-map search integration

### Planned Components

- PostgreSQL with PostGIS
- Supabase authentication and storage
- Versioned database migrations and row-level security
- GeoPandas
- scikit-learn
- AI-assisted text and image analysis

Python services will be introduced only when a later data-science feature requires them; they are not part of Phase 1.

## Design direction

Phase 1 uses a warm editorial visual language inspired by the HerStreet brief: a soft ivory base, blush surfaces, vivid pink accents, and deep plum text. Typography uses Cormorant Garamond for expressive headlines and Inter for the humanist UI, keeping the experience polished and accessible without relying on decorative script for body copy.

## Local Development

### Requirements

- Node.js 24 recommended
- npm
- Git
- A modern web browser

### Installation

Clone the repository:

```bash
git clone https://github.com/Divyanshi88/HERSTREETS.git
```

Enter the project directory:

```bash
cd HERSTREETS
```

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run serve
```

Open the application:

```text
http://localhost:3000
```

### Supabase configuration (Phase 2)

Phase 1 continues to work when Supabase is not configured. To enable community features:

1. Create a Supabase project.
2. Copy `config.js` to `config-local.js`.
3. Add the project's public URL and publishable/anon key to the `supabase` object in `config-local.js`.

The current HerStreet Supabase project already owns the reports, category, confirmation, photo, and moderation schema. Do not run a second observations schema on that project. The web app submits through `submit_report` and reads public-safe data through `get_public_reports`.

Only use the public anon key in browser configuration. Never add the Supabase service-role key to this repository or to frontend code.

### Available Commands

Run the development server:

```bash
npm run serve
```

Create a production build:

```bash
npm run build
```

Run the tests:

```bash
npm run test
```

Format the project:

```bash
npm run format
```

## Development Roadmap

### Phase 1 — Product Definition

- [x] Select a neighbourhood pilot
- [x] Define initial reporting categories
- [x] Establish the GitHub repository
- [x] Run the original map application
- [x] Create interface wireframes
- [x] Finalize the MVP requirements

### Phase 1 — Branded Routing Foundation

- [x] Introduce HerStreet branding
- [x] Add a responsive landing page
- [x] Connect landing search to the existing routing state
- [x] Preserve GraphHopper and OpenLayers map behavior
- [x] Add honest example-data and privacy messaging
- [x] Add accessibility and metadata improvements

### Phase 2 — Community Reporting

- [x] Connect to the existing versioned reports database schema
- [x] Add the optional Supabase client foundation
- [x] Add privacy rounding and row-level security policies
- [ ] Add authentication screens
- [ ] Create the report-submission flow
- [ ] Display reports on the map
- [ ] Add category and time filters
- [ ] Add report confirmation
- [ ] Add moderation controls

### Phase 3 — Route Intelligence

- [ ] Request alternative walking routes
- [ ] Divide routes into geographic segments
- [ ] Match reports to route segments
- [ ] Calculate comfort scores
- [ ] Calculate confidence levels
- [ ] Explain route differences

### Phase 4 — AI and Data Science

- [ ] Classify report text
- [ ] Detect duplicate reports
- [ ] Analyze report reliability
- [ ] Generate grounded route explanations
- [ ] Evaluate model accuracy and fairness

### Phase 5 — Testing and Release

- [ ] Conduct privacy testing
- [ ] Test mobile responsiveness
- [ ] Test low-data areas
- [ ] Test contradictory and outdated reports
- [ ] Conduct user testing
- [ ] Deploy the pilot application

## Open-Source Foundation

HerStreet is currently based on [GraphHopper Maps](https://github.com/graphhopper/graphhopper-maps), an open-source route-planning interface developed by the GraphHopper team.

GraphHopper Maps provides the initial mapping, search, route visualization, and navigation foundation. HerStreet’s community-reporting system, comfort model, time-aware analysis, confidence calculation, responsible-design framework, and women-centered experience are being developed as original project features.

GraphHopper Maps is distributed under the Apache License 2.0.

## Data Attribution

Map and routing data may include information contributed by the OpenStreetMap community. Appropriate OpenStreetMap and routing-provider attribution must remain visible in the application.

## Licence

This project retains the Apache License 2.0 from its GraphHopper Maps foundation. See `LICENSE.txt` for the complete licence text.

## Disclaimer

HerStreet is an informational community platform. Comfort scores and route explanations may be incomplete, outdated, or inaccurate. They are not guarantees of safety and should not replace personal judgment, official travel guidance, or emergency services.

## Creator

Created by [Divyanshi](https://github.com/Divyanshi88) as an AI, data-science, and full-stack web-development project focused on improving everyday urban experiences for women.
