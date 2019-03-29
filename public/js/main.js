const o = [
    'OpenFin',
    'Open',
    'Opinionated',
    'Ok',
    'Okay',
    'Odd',
    'Obnoxious'
]
const c = [
    'Cloud',
    'Corporate',
    'Community',
    'Connective',
    'Connected',
    'Communist',
    'Clippy'
]

const e = [
    'Enterprise',
    'Environmental',
    'Etrepreunerial',
    'Extra',
    'Egoistic',
    'Electronic',
    'Enterprising',
    'Evergreen',
    'Errorless',
    'Esoteric',
    'Etymological',
    'Extraneous',
    'Evangelical'
]
const s = ['OS', 'Services']

const words = { o, e, c }

const randomNum = (n) => {
    return Math.floor(Math.random() * n)
}

const keys = ['o', 'e', 'c']


const randomBool = () => Math.random() < .5

const pickName = () => {
    const count = randomNum(3) + 1
    const adjs = keys.slice(0, count)
        .map(k => words[k][randomNum(words[k].length)])
        .join(' ');
    const os = randomBool()
    return `${os ? 'The ' : ''}${adjs} ${os ? 'OS' : 'Services'}`
}

clippy.load('Clippy', agent => {
    agent.show();
    agent.speak('Welcome to ' + pickName())
})