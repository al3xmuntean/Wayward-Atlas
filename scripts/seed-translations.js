const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const sampleTranslations = [
  {
    keyword: "Elveț",
    translations: {
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
    },
  },
  {
    keyword: "Amalfi",
    translations: {
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
    },
  },
  {
    keyword: "Japonia",
    translations: {
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
    },
  },
  {
    keyword: "Santorini",
    translations: {
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
    },
  },
];

async function main() {
  const trips = await prisma.trip.findMany();
  console.log(`Found ${trips.length} trips in database.`);

  for (const trip of trips) {
    const match = sampleTranslations.find((st) => trip.title.includes(st.keyword));
    if (match) {
      console.log(`Updating trip "${trip.title}" with translations...`);
      await prisma.trip.update({
        where: { id: trip.id },
        data: {
          translations: JSON.stringify(match.translations),
        },
      });
    }
  }

  console.log("Translations update finished.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
