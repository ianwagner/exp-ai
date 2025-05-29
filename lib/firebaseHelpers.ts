import { collection, getDocs } from 'firebase/firestore';
import db from './firebase';
import { Step, ComponentInstance, OutputRule } from './types';

export async function getSteps(): Promise<Step[]> {
  const snapshot = await getDocs(collection(db, 'steps'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Step, 'id'>) }));
}

export async function getComponentInstances(componentType: string): Promise<ComponentInstance[]> {
  const snapshot = await getDocs(collection(db, `components/${componentType}/instances`));
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<ComponentInstance, 'id'>) }));
}

export async function getOutputRules(): Promise<OutputRule[]> {
  const snapshot = await getDocs(collection(db, 'outputs'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<OutputRule, 'id'>) }));
}
