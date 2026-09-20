const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.comment.deleteMany({});
  await prisma.tripAccess.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.user.deleteMany({});

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const userPasswordHash = await bcrypt.hash("user123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@wayward.atlas",
      name: "Alex Explorer (Admin)",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const registeredUser = await prisma.user.create({
    data: {
      email: "traveler@companion.com",
      name: "Elena C.",
      passwordHash: userPasswordHash,
      role: "USER",
    },
  });

  console.log(`Created admin: ${admin.email} and user: ${registeredUser.email}`);

  // Trip 1: 2021 - Alpii Elvețieni
  const trip2021 = await prisma.trip.create({
    data: {
      title: "Expediție în Alpii Elvețieni",
      description: "Trekking spectaculos în jurul masivului Matterhorn și văile din Zermatt.",
      startDate: new Date("2021-07-15T09:30:00Z"),
      endDate: new Date("2021-07-22T18:00:00Z"),
      isPrivate: false,
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
            tags: JSON.stringify(["lac", "munte", "natură", "reflexie"]),
          },
        ],
      },
    },
  });

  // Trip 2: 2022 - Italia: Roma & Coasta Amalfi
  const trip2022 = await prisma.trip.create({
    data: {
      title: "Vacanță pe Coasta Amalfi & Roma",
      description: "Istorie antică în Roma și peisaje dramatice de coastă în Positano și Amalfi.",
      startDate: new Date("2022-09-05T08:00:00Z"),
      endDate: new Date("2022-09-14T20:00:00Z"),
      isPrivate: false,
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
            tags: JSON.stringify(["arhitectură", "istorie", "monument", "oraș", "colosseum"]),
          },
          {
            url: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=400&q=80",
            latitude: 40.6281,
            longitude: 14.485,
            placeName: "Vedere spre Positano",
            city: "Positano",
            country: "Italia",
            takenAt: new Date("2022-09-10T18:30:00Z"),
            hasPeople: true, // Photo with person -> private
            isPrivate: true,
            tags: JSON.stringify(["plajă", "mare", "apus", "persoană", "coastă", "oraș"]),
          },
        ],
      },
    },
  });

  // Trip 3: 2023 - Japonia: Tokyo & Kyoto
  const trip2023 = await prisma.trip.create({
    data: {
      title: "Explorare Japonia: Tokyo, Kyoto & Muntele Fuji",
      description: "Neonul din Shinjuku, templele liniștite din Kyoto și maiestuosul Munte Fuji.",
      startDate: new Date("2023-04-10T12:00:00Z"),
      endDate: new Date("2023-04-24T22:00:00Z"),
      isPrivate: false,
      createdById: admin.id,
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80",
            latitude: 35.0116,
            longitude: 135.7681,
            placeName: "Templu tradițional în Kyoto",
            city: "Kyoto",
            country: "Japonia",
            takenAt: new Date("2023-04-14T11:00:00Z"),
            hasPeople: false,
            isPrivate: false,
            tags: JSON.stringify(["templu", "istorie", "grădină", "arhitectură", "zen"]),
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
            tags: JSON.stringify(["turn", "oraș", "noapte", "apus", "lumini"]),
          },
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
            tags: JSON.stringify(["munte", "fuji", "cireși", "natură", "primăvară"]),
          },
        ],
      },
    },
  });

  // Trip 4: 2024 - Grecia: Santorini & Insulele Ciclade (Trip privat partajat cu Elena)
  const trip2024 = await prisma.trip.create({
    data: {
      title: "Santorini & Ciclade în Familie",
      description: "Apusuri de neuitat în Oia, case albe cu cupole albastre și croazieră pe caldera.",
      startDate: new Date("2024-06-01T10:00:00Z"),
      endDate: new Date("2024-06-09T18:00:00Z"),
      isPrivate: true,
      createdById: admin.id,
      allowedUsers: {
        create: [
          {
            userId: registeredUser.id,
          },
        ],
      },
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
            thumbnailUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=400&q=80",
            latitude: 36.4618,
            longitude: 25.3753,
            placeName: "Oia & Cupolele Albastre",
            city: "Oia",
            country: "Grecia",
            takenAt: new Date("2024-06-03T19:40:00Z"),
            hasPeople: false,
            isPrivate: true,
            tags: JSON.stringify(["apus", "mare", "insulă", "arhitectură", "grecia"]),
          },
        ],
      },
      comments: {
        create: [
          {
            userId: registeredUser.id,
            content: "Apusul din Oia a fost absolut magic! Mă bucur că am împărtășit această călătorie!",
            createdAt: new Date("2024-06-04T10:30:00Z"),
          },
        ],
      },
    },
  });

  // Add comment on public trip
  await prisma.comment.create({
    data: {
      tripId: trip2023.id,
      userId: registeredUser.id,
      content: "Poza cu Muntele Fuji este incredibilă! Arată ca o pictură.",
      createdAt: new Date("2023-04-25T14:00:00Z"),
    },
  });

  console.log("Seeding completed successfully with 4 multi-year trips, photos, tags, comments, and permissions!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
