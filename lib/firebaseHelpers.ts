import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import db, { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type {
  Step,
  ComponentInstance,
  ComponentType,
  InputField,
  MakerType,
} from './types';

export async function uploadFile(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export async function getSteps(): Promise<Step[]> {
  const snapshot = await getDocs(collection(db, 'steps'));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Step, 'id'>) }));
}

export async function getMakerTypes(): Promise<MakerType[]> {
  const snapshot = await getDocs(collection(db, 'makerTypes'));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<MakerType, 'id'>),
  }));
}

export async function getComponentInstances(componentType: string): Promise<ComponentInstance[]> {
  const snapshot = await getDocs(collection(db, `components/${componentType}/instances`));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ComponentInstance, 'id'>) }));
}

// Component Types -----------------------------------------------------------

export async function getComponentTypes(): Promise<ComponentType[]> {
  const snapshot = await getDocs(collection(db, 'components'));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ComponentType, 'id'>) }));
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

export async function setMakerType(mt: MakerType): Promise<void> {
  const { id, ...data } = mt;
  await setDoc(doc(db, 'makerTypes', id), data);
}

// Experiences ---------------------------------------------------------------

import type { Experience } from './types';

export async function getExperiences(): Promise<Experience[]> {
  const snapshot = await getDocs(collection(db, 'experiences'));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Experience, 'id'>),
  }));
}

export async function setExperience(exp: Experience): Promise<void> {
  const { id, ...data } = exp;
  await setDoc(doc(db, 'experiences', id), data);
}

export async function deleteExperience(id: string): Promise<void> {
  await deleteDoc(doc(db, 'experiences', id));
}
