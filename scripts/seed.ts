import 'dotenv/config';
import { db } from '../src/lib/db/client';
import { companies, projects, articles, profiles } from '../src/lib/db/schema';
import { faker } from '@faker-js/faker';

// Major US cities with coordinates for realistic project locations
const cities = [
  { name: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060, neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx'] },
  { name: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437, neighborhoods: ['Downtown', 'West Hollywood', 'Santa Monica', 'Venice'] },
  { name: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298, neighborhoods: ['Loop', 'River North', 'Lincoln Park', 'Wicker Park'] },
  { name: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918, neighborhoods: ['Brickell', 'Wynwood', 'South Beach', 'Coral Gables'] },
  { name: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194, neighborhoods: ['SOMA', 'Mission', 'Financial District', 'Hayes Valley'] },
  { name: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431, neighborhoods: ['Downtown', 'East Austin', 'South Congress', 'Domain'] },
  { name: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321, neighborhoods: ['Capitol Hill', 'Ballard', 'Fremont', 'South Lake Union'] },
  { name: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589, neighborhoods: ['Back Bay', 'Seaport', 'Cambridge', 'Beacon Hill'] },
];

const companyCategories = ['Developer', 'Architect', 'General Contractor', 'Broker', 'Property Management'];
const propertyTypes = ['Residential', 'Commercial', 'Mixed-Use', 'Office', 'Retail', 'Industrial', 'Hospitality'];
const projectStatuses = ['proposed', 'approved', 'under_construction', 'completed'] as const;

// Sample realistic company names
const developerNames = [
  'Urban Development Group', 'Metropolitan Builders', 'Skyline Properties', 'Cornerstone Development',
  'Horizon Realty Partners', 'Landmark Development Corp', 'Gateway Urban', 'Premier Development Co',
  'Cityscape Partners', 'Apex Development Group', 'Summit Real Estate', 'Riverside Development'
];

const architectNames = [
  'Modern Architecture Studio', 'Design Collective', 'Urban Design Partners', 'Architectural Innovations',
  'Studio + Design', 'Contemporary Architects', 'Vision Architecture', 'Form + Function Design'
];

async function seed() {
  console.log('🌱 Starting seed...');

  // Create a dummy profile for article authorship
  console.log('Creating author profile...');
  const [authorProfile] = await db.insert(profiles).values({
    clerk_id: 'seed_author_' + Date.now(),
    email: 'editor@connectcre.com',
    full_name: 'ConnectCRE Editorial Team',
    avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=ConnectCRE',
    persona: 'Editor',
  }).returning();
  console.log(`✅ Created author profile: ${authorProfile.email}`);

  // Create sample companies
  console.log('Creating companies...');
  const companyInserts = [];

  for (const name of [...developerNames, ...architectNames]) {
    const isArchitect = architectNames.includes(name);
    const city = faker.helpers.arrayElement(cities);

    companyInserts.push({
      name,
      description: faker.company.catchPhrase() + '. ' + faker.lorem.paragraph(),
      logo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
      website_url: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`,
      contact_email: `contact@${name.toLowerCase().replace(/\s+/g, '')}.com`,
      contact_phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      city: city.name,
      state: city.state,
      country: 'USA',
      categories: isArchitect ? ['Architect'] : ['Developer'],
      is_verified: faker.datatype.boolean(0.8),
      status: 'approved' as const,
    });
  }

  const insertedCompanies = await db.insert(companies).values(companyInserts).returning();
  console.log(`✅ Created ${insertedCompanies.length} companies`);

  // Create sample projects
  console.log('Creating projects...');
  const projectInserts = [];

  for (let i = 0; i < 50; i++) {
    const city = faker.helpers.arrayElement(cities);
    const neighborhood = faker.helpers.arrayElement(city.neighborhoods);
    const company = faker.helpers.arrayElement(insertedCompanies.filter(c => c.categories.includes('Developer')));
    const numTypes = faker.number.int({ min: 1, max: 3 });
    const types = faker.helpers.arrayElements(propertyTypes, numTypes);

    // Generate realistic coordinates near city center
    const lat = city.lat + (Math.random() - 0.5) * 0.1;
    const lng = city.lng + (Math.random() - 0.5) * 0.1;

    const images = Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, (_, idx) =>
      `https://images.unsplash.com/photo-${1600000000000 + i * 1000 + idx}?w=1200`
    );

    projectInserts.push({
      title: `${faker.word.adjective()} ${faker.helpers.arrayElement(['Tower', 'Plaza', 'Center', 'Commons', 'District', 'Square'])}`,
      description: faker.lorem.paragraphs(3),
      address: faker.location.streetAddress(),
      latitude: lat,
      longitude: lng,
      city: city.name,
      neighborhood,
      status: faker.helpers.arrayElement(projectStatuses),
      property_types: types,
      images,
      metadata: {
        units: types.includes('Residential') ? faker.number.int({ min: 50, max: 500 }) : undefined,
        square_feet: faker.number.int({ min: 50000, max: 500000 }),
        floors: faker.number.int({ min: 5, max: 40 }),
      },
      company_id: company.id,
      published_at: faker.date.past({ years: 1 }),
    });
  }

  const insertedProjects = await db.insert(projects).values(projectInserts).returning();
  console.log(`✅ Created ${insertedProjects.length} projects`);

  // Create sample articles
  console.log('Creating articles...');
  const articleInserts = [];

  const articleTemplates = [
    { title: 'Major Mixed-Use Development Breaks Ground in {city}', type: 'groundbreaking' },
    { title: '{company} Announces New {type} Project in {neighborhood}', type: 'announcement' },
    { title: 'Luxury {type} Tower Tops Out in Downtown {city}', type: 'construction' },
    { title: 'Historic {neighborhood} Building to Undergo Major Renovation', type: 'renovation' },
    { title: '{city} Approves Ambitious Waterfront Development Plan', type: 'approval' },
    { title: 'New Affordable Housing Project Planned for {neighborhood}', type: 'affordable' },
    { title: '{company} Secures Financing for Landmark {city} Development', type: 'financing' },
    { title: 'Sustainable {type} Project Sets New Green Building Standards', type: 'sustainability' },
  ];

  for (let i = 0; i < 60; i++) {
    const city = faker.helpers.arrayElement(cities);
    const neighborhood = faker.helpers.arrayElement(city.neighborhoods);
    const company = faker.helpers.arrayElement(insertedCompanies);
    const project = i < 30 ? faker.helpers.arrayElement(insertedProjects) : null;
    const template = faker.helpers.arrayElement(articleTemplates);

    const title = template.title
      .replace('{city}', city.name)
      .replace('{neighborhood}', neighborhood)
      .replace('{company}', company.name)
      .replace('{type}', faker.helpers.arrayElement(propertyTypes));

    const images = Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, (_, idx) =>
      `https://images.unsplash.com/photo-${1600000000000 + i * 10000 + idx}?w=1200`
    );

    // Generate rich content blocks
    const content = [
      { type: 'paragraph', content: faker.lorem.paragraphs(2) },
      { type: 'heading', level: 2, content: 'Project Details' },
      { type: 'paragraph', content: faker.lorem.paragraphs(3) },
      { type: 'quote', content: faker.lorem.sentence(), author: faker.person.fullName() },
      { type: 'paragraph', content: faker.lorem.paragraphs(2) },
    ];

    articleInserts.push({
      title,
      subtitle: faker.lorem.sentence(),
      content,
      images,
      author_id: authorProfile.id,
      project_id: project?.id || null,
      city: city.name,
      neighborhood,
      tags: faker.helpers.arrayElements(['development', 'construction', 'real-estate', 'architecture', 'urban-planning'], faker.number.int({ min: 2, max: 4 })),
      published_at: faker.date.past({ years: 1 }),
    });
  }

  const insertedArticles = await db.insert(articles).values(articleInserts).returning();
  console.log(`✅ Created ${insertedArticles.length} articles`);

  console.log('🎉 Seed completed successfully!');
  console.log(`
Summary:
- ${insertedCompanies.length} companies
- ${insertedProjects.length} projects
- ${insertedArticles.length} articles
  `);
}

seed()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
