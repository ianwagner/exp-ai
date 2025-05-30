import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import db from './firebase';
import type {
  Step,
  ComponentInstance,
  OutputRule,
  ComponentType,
  InputField,
} from './types';

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

// Component Types -----------------------------------------------------------

export async function getComponentTypes(): Promise<ComponentType[]> {
  const snapshot = await getDocs(collection(db, 'components'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<ComponentType, 'id'>) }));
}

export async function setComponentType(type: ComponentType): Promise<void> {
  const { id, ...data } = type;
  await setDoc(doc(db, 'components', id), data);
}

export async function updateComponentTypeSchema(
  id: string,
  fields: InputField[]
): Promise<void> {
  await updateDoc(doc(db, 'components', id), { fields });
}

// Component Instances ------------------------------------------------------

export async function setComponentInstance(
  typeId: string,
  instance: ComponentInstance
): Promise<void> {
  const { id, ...data } = instance;
  await setDoc(doc(db, `components/${typeId}/instances`, id), data);
}

// Output Rules -------------------------------------------------------------

export async function setOutputRule(rule: OutputRule): Promise<void> {
  const { id, ...data } = rule;
  await setDoc(doc(db, 'outputs', id), data);
}
