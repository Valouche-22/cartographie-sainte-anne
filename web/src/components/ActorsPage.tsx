import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ActorsPageProps {
  stepNumber: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
}

const ACTORS = [
  {
    title: "La cheffe d'établissement",
    statut: "Rémunérée par l'État (enseignement) et par l'OGEC (direction)",
    description:
      "La cheffe d'établissement partage son temps entre la direction de l'école et une classe de CE2-CM1. Elle enseigne à mi-temps et consacre l'autre moitié de son temps à la direction : organisation de l'école, suivi des élèves, échanges avec les familles et coordination avec l'équipe enseignante. Elle est également directrice de l'OGEC.",
  },
  {
    title: 'Les enseignants',
    statut: "Rémunérés par l'État (Éducation nationale)",
    description:
      "Les 11 enseignants se répartissent entre les classes, de la maternelle au CM2. Ils font découvrir de nouvelles notions, préparent les activités et accompagnent les élèves tout au long de l'année. Ils suivent les progrès de chacun et échangent régulièrement avec les familles.",
  },
  {
    title: 'Les AESH',
    statut: "Rémunérées par l'État (Éducation nationale)",
    description:
      "Les AESH accompagnent les élèves qui ont besoin d'une aide particulière pour suivre leur scolarité. Elles les aident à comprendre les consignes, à participer aux activités de la classe et à gagner en autonomie, tout en s'adaptant à leurs besoins.",
  },
  {
    title: 'Les ASEM',
    statut: "Salariées de l'OGEC",
    description:
      "Les ASEM travaillent auprès des plus petits, principalement en maternelle. Elles aident les enfants à s'habiller, à aller aux toilettes et à gagner en autonomie dans les gestes du quotidien. Elles participent aussi aux activités en classe, préparent le matériel et accompagnent les enseignants tout au long de la journée. Elles sont toutes salariées de l'OGEC.",
  },
  {
    title: "L'APEL",
    statut: "Association de parents d'élèves",
    description:
      "L'APEL rassemble les parents qui souhaitent s'investir dans la vie de l'école. Ils organisent des événements et des ventes, comme la vente de sapins de Noël, tout au long de l'année. L'argent récolté permet de financer des sorties, des activités et du matériel pour les élèves.",
  },
  {
    title: "L'OGEC",
    statut: 'Association de gestion financière et matérielle',
    description:
      "L'OGEC s'occupe de tout ce qui permet à l'école de fonctionner en dehors de la classe. Il gère le budget, les bâtiments, leur entretien et le personnel non enseignant. C'est notamment grâce à lui que les locaux sont entretenus et que l'école dispose des moyens matériels nécessaires à son fonctionnement.",
  },
];

export const ActorsPage: React.FC<ActorsPageProps> = ({ stepNumber, totalSteps, onPrev, onNext }) => {
  return (
    <div className="actors-inner">
      <header className="actors-header">
        <div>
          <h2 className="actors-title">Les acteurs de l'école</h2>
          <p className="actors-subtitle">École Sainte-Anne de Pordic</p>
        </div>
        <span className="col-step-badge actors-step-badge">
          {stepNumber} / {totalSteps}
        </span>
      </header>

      <div className="actors-grid">
        {ACTORS.map((actor) => (
          <article className="actor-entry" key={actor.title}>
            <div className="actor-entry-head">
              <h3 className="actor-name">{actor.title}</h3>
              <span className="actor-statut">{actor.statut}</span>
            </div>
            <p className="actor-desc">{actor.description}</p>
          </article>
        ))}
      </div>

      <footer className="actors-footer">
        <button type="button" className="step-nav-btn" onClick={onPrev}>
          <ChevronUp size={15} /> Précédent
        </button>
        <button type="button" className="step-nav-btn primary" onClick={onNext}>
          Suivant <ChevronDown size={15} />
        </button>
      </footer>
    </div>
  );
};
