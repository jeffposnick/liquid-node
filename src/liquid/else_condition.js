import Condition from './condition';

export default class ElseCondition extends Condition {
  evaluate() {
    return true;
  }
}
