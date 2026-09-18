// Nomi inventati per il mondo di default. I nomi reali arrivano solo dal database caricato dall'utente.

export const NATIONS: Record<string, { w: number; first: string[]; last: string[] }> = {
  ITA: {
    w: 62,
    first: ['Marco', 'Luca', 'Andrea', 'Matteo', 'Lorenzo', 'Davide', 'Simone', 'Federico', 'Riccardo', 'Alessio', 'Nicolò', 'Tommaso', 'Gabriele', 'Emanuele', 'Stefano', 'Filippo', 'Edoardo', 'Samuele', 'Mattia', 'Leonardo', 'Pietro', 'Giacomo', 'Daniele', 'Christian', 'Manuel', 'Cristian', 'Alberto', 'Michele', 'Giorgio', 'Enrico'],
    last: ['Rossi', 'Bianchi', 'Ferraro', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone', 'Longo', 'Gentile', 'Martinelli', 'Vitale', 'Serra', 'Coppola', 'De Santis', 'Neri', 'Villa', 'Parisi', 'Fabbri', 'Sala', 'Pellegrini', 'Monti', 'Cattaneo', 'Orlando', 'Testa', 'Marchetti', 'Grasso', 'Palumbo', 'Bellini'],
  },
  ESP: { w: 5, first: ['Sergio', 'Pablo', 'Álvaro', 'Iker', 'Jorge', 'Raúl', 'Hugo', 'Adrián', 'Dani', 'Rubén'], last: ['García', 'Martínez', 'López', 'Sánchez', 'Ortega', 'Navarro', 'Romero', 'Torres', 'Iglesias', 'Castillo'] },
  FRA: { w: 5, first: ['Hugo', 'Théo', 'Lucas', 'Mathis', 'Yanis', 'Enzo', 'Kylian', 'Maxime', 'Axel', 'Nolan'], last: ['Martin', 'Dubois', 'Moreau', 'Laurent', 'Lefèvre', 'Girard', 'Fournier', 'Mercier', 'Blanc', 'Garnier'] },
  BRA: { w: 5, first: ['Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Thiago', 'Vinícius', 'Bruno', 'Caio', 'Diego', 'Igor'], last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Almeida', 'Ribeiro', 'Carvalho', 'Gomes', 'Barbosa'] },
  ARG: { w: 4, first: ['Matías', 'Nicolás', 'Facundo', 'Julián', 'Lautaro', 'Franco', 'Tomás', 'Agustín', 'Joaquín', 'Santiago'], last: ['González', 'Fernández', 'Rodríguez', 'Álvarez', 'Benítez', 'Acosta', 'Medina', 'Herrera', 'Sosa', 'Molina'] },
  POR: { w: 3, first: ['João', 'Diogo', 'Rúben', 'Tiago', 'André', 'Gonçalo', 'Nuno', 'Rui', 'Pedro', 'Vitor'], last: ['Ferreira', 'Pereira', 'Cardoso', 'Neves', 'Mendes', 'Lopes', 'Marques', 'Fonseca', 'Pinto', 'Rocha'] },
  NED: { w: 3, first: ['Daan', 'Sem', 'Jesse', 'Bram', 'Luuk', 'Thijs', 'Milan', 'Stijn', 'Joep', 'Ruben'], last: ['de Jong', 'Jansen', 'Visser', 'Bakker', 'Smit', 'Meijer', 'de Vries', 'Mulder', 'Bos', 'Dekker'] },
  SRB: { w: 3, first: ['Nikola', 'Luka', 'Stefan', 'Marko', 'Dušan', 'Filip', 'Aleksandar', 'Nemanja', 'Uroš', 'Vuk'], last: ['Petrović', 'Jovanović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Pavlović', 'Milošević', 'Lazić'] },
  CRO: { w: 3, first: ['Ivan', 'Josip', 'Mario', 'Ante', 'Luka', 'Domagoj', 'Tomislav', 'Marin', 'Dario', 'Mateo'], last: ['Horvat', 'Kovačević', 'Babić', 'Marić', 'Jurić', 'Novak', 'Knežević', 'Vuković', 'Perić', 'Pavić'] },
  SEN: { w: 3, first: ['Moussa', 'Ibrahima', 'Cheikh', 'Pape', 'Mamadou', 'Ousmane', 'Abdou', 'Lamine', 'Idrissa', 'Aliou'], last: ['Diallo', 'Ndiaye', 'Sow', 'Diop', 'Fall', 'Sarr', 'Gueye', 'Cissé', 'Faye', 'Kouyaté'] },
  NGA: { w: 2, first: ['Chidi', 'Emeka', 'Samuel', 'Victor', 'Kelechi', 'Tunde', 'Ahmed', 'Wilfred', 'Ikenna', 'Obinna'], last: ['Okafor', 'Eze', 'Adeyemi', 'Okonkwo', 'Nwosu', 'Balogun', 'Obi', 'Chukwu', 'Onyeka', 'Adebayo'] },
  SWE: { w: 2, first: ['Erik', 'Oscar', 'Viktor', 'Emil', 'Anton', 'Isak', 'Albin', 'Jonas', 'Linus', 'Gustav'], last: ['Lindqvist', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Berg', 'Holm', 'Sandberg'] },
};

// Città inventate (i club reali entrano solo col database dell'utente)
export const CITIES = [
  'Valdoria', 'Portobruno', 'Castelmarino', 'Rivalta', 'Montecorvo', 'Santa Lidia', 'Borgoferro', 'Acquanera',
  'Pratolungo', 'Serravento', 'Lagonero', 'Roccabianca', 'Vallombra', 'Torre Alta', 'Fiumescuro', 'Campoverde',
  'Sassorosso', 'Marenza', 'Colle Aurelio', 'Pietrafonda', 'Ventimonti', 'Brenaro', 'Casalforte', 'Ortanova',
  'San Ferrante', 'Lucerna', 'Vignarola', 'Castrovalle', 'Monteluce', 'Porto Aldo', 'Grisano', 'Ferravilla',
  "Sant'Elmo", 'Querceto', 'Pianoro', 'Albarella', 'Corvino', 'Stellanza', 'Mirabassa', "Rocca d'Oro",
];

export const CLUB_PREFIX = ['AC', 'US', 'FC', 'SS', 'AS', 'Virtus', 'Sporting', 'Atletico', 'Unione', 'Calcio'];

export const KIT_COLORS = ['#C8102E', '#0033A0', '#111111', '#FFFFFF', '#FFD100', '#00843D', '#6F2DA8', '#FF6A13', '#7EC8E3', '#8B0000', '#003B5C', '#1E90FF', '#F2C200', '#5B2C1D'];
