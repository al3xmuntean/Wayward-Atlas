const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with multi-role accounts and test trips...");

  // Clean existing tables
  await prisma.comment.deleteMany({});
  await prisma.tripAccess.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.user.deleteMany({});

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const partnerPasswordHash = await bcrypt.hash("partner123", 10);
  const friendPasswordHash = await bcrypt.hash("friend123", 10);
  const viewerPasswordHash = await bcrypt.hash("viewer123", 10);

  // 1. Admin account
  const admin = await prisma.user.create({
    data: {
      email: "admin@wayward.atlas",
      name: "Alex (Admin)",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      canViewPrivate: true,
    },
  });

  // 2. Partner account
  const partner = await prisma.user.create({
    data: {
      email: "partner@wayward.atlas",
      name: "Partener",
      passwordHash: partnerPasswordHash,
      role: "PARTNER",
      canViewPrivate: true,
    },
  });

  // 3. Close Friend account
  const friend = await prisma.user.create({
    data: {
      email: "friend@wayward.atlas",
      name: "Radu (Close Friend)",
      passwordHash: friendPasswordHash,
      role: "CLOSE_FRIEND",
      canViewPrivate: false,
    },
  });

  // 4. Viewer account
  const viewer = await prisma.user.create({
    data: {
      email: "viewer@wayward.atlas",
      name: "Elena (Viewer)",
      passwordHash: viewerPasswordHash,
      role: "VIEWER",
      canViewPrivate: false,
    },
  });

  console.log("Created 4 test accounts:");
  console.log(`- ADMIN: ${admin.email} (pass: admin123)`);
  console.log(`- PARTNER: ${partner.email} (pass: partner123)`);
  console.log(`- CLOSE_FRIEND: ${friend.email} (pass: friend123)`);
  console.log(`- VIEWER: ${viewer.email} (pass: viewer123)`);

  // --- TRIP 1: 2021 - Switzerland ---
  const trip2021 = await prisma.trip.create({
    data: {
      title: "Expediție în Alpii Elvețieni",
      description: "Trekking spectaculos în jurul masivului Matterhorn și văile alpine din Zermatt.",
      translations: JSON.stringify({
        en: {
          title: "Swiss Alps Expedition",
          description: "Spectacular trekking around the Matterhorn massif and the alpine valleys of Zermatt.",
        },
        de: {
          title: "Schweizer Alpen Expedition",
          description: "Spektakuläres Trekking rund um das Matterhorn-Massiv und die alpinen Täler von Zermatt.",
        },
        es: {
          title: "Expedición a los Alpes Suizos",
          description: "Trekking espectacular alrededor del macizo del Cervino y los valles alpinos de Zermatt.",
        },
        fr: {
          title: "Expédition dans les Alpes Suisses",
          description: "Trekking spectaculaire autour du massif du Cervin et des vallées alpines de Zermatt.",
        },
      }),
      startDate: new Date("2021-07-15T09:30:00Z"),
      endDate: new Date("2021-07-22T18:00:00Z"),
      isPrivate: false,
      minRole: "VIEWER",
      withPartner: false,
      createdById: admin.id,
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=400&q=80",
            latitude: 45.9765,
            longitude: 7.7491,
            placeName: "Matterhorn & Gornergrat",
            city: "Zermatt",
            country: "Elveția",
            takenAt: new Date("2021-07-16T14:20:00Z"),
            hasPeople: false,
            isPrivate: false,
            minRole: "PUBLIC",
            isCountryCover: true, // Single designated showcase image for Switzerland in Public mode
            tags: JSON.stringify(["munte", "zăpadă", "peisaj", "trekking", "alpi"]),
          },
          {
            url: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=400&q=80",
            latitude: 46.0207,
            longitude: 7.7491,
            placeName: "Lacul Riffelsee",
            city: "Zermatt",
            country: "Elveția",
            takenAt: new Date("2021-07-18T10:15:00Z"),
            hasPeople: false,
            isPrivate: false,
            minRole: "VIEWER",
            isCountryCover: false,
            tags: JSON.stringify(["lac", "munte", "natură", "reflexie"]),
          },
        ],
      },
    },
  });

  // --- TRIP 2: 2022 - Italy: Rome & Amalfi ---
  const trip2022 = await prisma.trip.create({
    data: {
      title: "Vacanță pe Coasta Amalfi & Roma",
      description: "Istorie antică în Roma și peisaje dramatice de coastă în Positano și Amalfi.",
      translations: JSON.stringify({
        en: {
          title: "Amalfi Coast & Rome Getaway",
          description: "Ancient history in Rome and dramatic coastal scenery across Positano and Amalfi.",
        },
        de: {
          title: "Amalfiküste & Rom Urlaub",
          description: "Antike Geschichte in Rom und dramatische Küstenlandschaften in Positano und Amalfi.",
        },
        es: {
          title: "Vacaciones en la Costa Amalfitana y Roma",
          description: "Historia antigua en Roma y paisajes costeros impresionantes en Positano y Amalfi.",
        },
        fr: {
          title: "Séjour sur la Côte Amalfitaine et Rome",
          description: "Histoire antique à Rome et paysages côtiers spectaculaires à Positano et Amalfi.",
        },
      }),
      startDate: new Date("2022-09-05T08:00:00Z"),
      endDate: new Date("2022-09-14T20:00:00Z"),
      isPrivate: false,
      minRole: "VIEWER",
      withPartner: false,
      createdById: admin.id,
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=400&q=80",
            latitude: 41.8902,
            longitude: 12.4922,
            placeName: "Colosseum & Forumul Roman",
            city: "Roma",
            country: "Italia",
            takenAt: new Date("2022-09-06T15:45:00Z"),
            hasPeople: false,
            isPrivate: false,
            minRole: "PUBLIC",
            isCountryCover: true, // Single designated showcase image for Italy in Public mode
            tags: JSON.stringify(["arhitectură", "istorie", "monument", "oraș", "colosseum"]),
          },
          {
            url: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=400&q=80",
            latitude: 40.6281,
            longitude: 14.485,
            placeName: "Positano pe Faleză",
            city: "Positano",
            country: "Italia",
            takenAt: new Date("2022-09-10T18:30:00Z"),
            hasPeople: true, // Photo with people -> visible only to CLOSE_FRIEND, PARTNER, ADMIN
            isPrivate: false,
            minRole: "CLOSE_FRIEND",
            isCountryCover: false,
            tags: JSON.stringify(["plajă", "mare", "apus", "oameni", "coastă", "prieteni"]),
          },
        ],
      },
    },
  });

  // --- TRIP 3: 2023 - Japan: Tokyo & Kyoto ---
  const trip2023 = await prisma.trip.create({
    data: {
      title: "Explorare Japonia: Tokyo, Kyoto & Muntele Fuji",
      description: "Neonul din Shinjuku, templele liniștite din Kyoto și maiestuosul Munte Fuji.",
      translations: JSON.stringify({
        en: {
          title: "Japan Exploration: Tokyo, Kyoto & Mount Fuji",
          description: "Neon lights in Shinjuku, serene temples in Kyoto, and the majestic Mount Fuji.",
        },
        de: {
          title: "Japan Erkundung: Tokio, Kyoto & Berg Fuji",
          description: "Neonlichter in Shinjuku, ruhige Tempel in Kyoto und der majestätische Berg Fuji.",
        },
        es: {
          title: "Exploración de Japón: Tokio, Kioto y Monte Fuji",
          description: "Luces de neón en Shinjuku, templos tranquilos en Kioto y el majestuoso Monte Fuji.",
        },
        fr: {
          title: "Exploration du Japon: Tokyo, Kyoto & Mont Fuji",
          description: "Néons de Shinjuku, temples paisibles de Kyoto et le majestueux Mont Fuji.",
        },
      }),
      startDate: new Date("2023-04-10T12:00:00Z"),
      endDate: new Date("2023-04-24T22:00:00Z"),
      isPrivate: false,
      minRole: "VIEWER",
      withPartner: false,
      createdById: admin.id,
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=400&q=80",
            latitude: 35.3606,
            longitude: 138.7274,
            placeName: "Muntele Fuji & Cireși Înfloriți",
            city: "Fujikawaguchiko",
            country: "Japonia",
            takenAt: new Date("2023-04-20T08:30:00Z"),
            hasPeople: false,
            isPrivate: false,
            minRole: "PUBLIC",
            isCountryCover: true, // Single designated showcase image for Japan in Public mode
            tags: JSON.stringify(["munte", "fuji", "cireși", "natură", "primăvară"]),
          },
          {
            url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80",
            latitude: 35.6586,
            longitude: 139.7454,
            placeName: "Turnul Tokyo la apus",
            city: "Tokyo",
            country: "Japonia",
            takenAt: new Date("2023-04-18T19:15:00Z"),
            hasPeople: false,
            isPrivate: false,
            minRole: "VIEWER",
            isCountryCover: false,
            tags: JSON.stringify(["turn", "oraș", "noapte", "apus", "lumini"]),
          },
          {
            url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80",
            latitude: 35.0116,
            longitude: 135.7681,
            placeName: "Templu tradițional în Kyoto",
            city: "Kyoto",
            country: "Japonia",
            takenAt: new Date("2023-04-14T11:00:00Z"),
            hasPeople: true, // Photo with person -> visible only to CLOSE_FRIEND, PARTNER, ADMIN
            isPrivate: false,
            minRole: "CLOSE_FRIEND",
            isCountryCover: false,
            tags: JSON.stringify(["templu", "istorie", "grădină", "persoană", "kimono"]),
          },
        ],
      },
    },
  });

  // --- TRIP 4: 2024 - Greece: Santorini (Partner Exclusive Trip) ---
  const trip2024 = await prisma.trip.create({
    data: {
      title: "Santorini & Ciclade în Doi",
      description: "Apusuri de neuitat în Oia, străduțe albe și croazieră romantică pe caldera la apus.",
      translations: JSON.stringify({
        en: {
          title: "Romantic Santorini & the Cyclades",
          description: "Unforgettable sunsets in Oia, whitewashed alleys, and a romantic sunset caldera cruise.",
        },
        de: {
          title: "Romantisches Santorin & die Kykladen",
          description: "Unvergessliche Sonnenuntergänge in Oia, weiße Gassen und eine romantische Sonnenuntergangs-Kreuzfahrt auf der Caldera.",
        },
        es: {
          title: "Santorini y Cícladas en Pareja",
          description: "Atardeceres inolvidables en Oia, callejuelas blancas y un romántico crucero por la caldera al atardecer.",
        },
        fr: {
          title: "Santorin & les Cyclades en Duo",
          description: "Couchers de soleil inoubliables à Oia, ruelles blanchies à la chaux et croisière romantique au coucher du soleil dans la caldeira.",
        },
      }),
      startDate: new Date("2024-06-01T10:00:00Z"),
      endDate: new Date("2024-06-09T18:00:00Z"),
      isPrivate: true,
      minRole: "PARTNER", // Visible only to PARTNER & ADMIN
      withPartner: true, // Marked as done together with partner
      partnerNotes: "Călătoria noastră de aniversare. Cina la lumina lumânărilor pe faleza din Oia și degustarea de vinuri la apus în Pyrgos au fost amintiri magice de neuitat!",
      createdById: admin.id,
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=400&q=80",
            latitude: 36.4618,
            longitude: 25.3753,
            placeName: "Oia & Cupolele Albastre la Apus",
            city: "Oia",
            country: "Grecia",
            takenAt: new Date("2024-06-03T19:40:00Z"),
            hasPeople: true,
            isPrivate: true,
            minRole: "PARTNER",
            isCountryCover: false,
            partnerPreselected: true,
            tags: JSON.stringify(["apus", "mare", "insulă", "romantic", "cuplu", "grecia"]),
          },
        ],
      },
      comments: {
        create: [
          {
            userId: partner.id,
            content: "A fost cea mai frumoasă călătorie a noastră! Mă bucur nespus de fiecare moment trăit împreună.",
            createdAt: new Date("2024-06-04T10:30:00Z"),
          },
        ],
      },
    },
  });

  // Comments
  await prisma.comment.create({
    data: {
      tripId: trip2023.id,
      userId: viewer.id,
      content: "Poza cu Muntele Fuji este incredibilă! Arată ca o pictură.",
      createdAt: new Date("2023-04-25T14:00:00Z"),
    },
  });

  console.log("Database seeded successfully with all 5 role tiers and test data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
