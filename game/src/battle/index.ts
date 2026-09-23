// Battle module entry: installs setBattleImpl() and battle debug commands.
import { registerScene } from '../boot';
import { EnemyGalleryScene } from './gallery';
import '../art/enemies/hato';

registerScene('enemies', (p) => new EnemyGalleryScene(p));
