import React from 'react';
import {View} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {C} from '../theme/tokens';
import {Primary,Sheet,Txt} from './Ui';

/** Form content in the shared bottom Sheet (safe-area aware on every platform; drag down, tap outside or
 *  press the close button to dismiss — that is the Cancel). `onDone` becomes the primary footer button.
 *  `cancelLabel` is accepted for API compatibility but the sheet's own close affordance replaces it.
 *  KeyboardAvoidingView lifts the panel's content over the keyboard, the same pattern Add Job uses. */
export function FormSheet({visible,title,onClose,doneLabel,onDone,doneDisabled=false,scroll=true,children,footer}:{visible:boolean,title:string,onClose:()=>void,cancelLabel?:string|null,doneLabel:string,onDone:()=>void,doneDisabled?:boolean,scroll?:boolean,children:React.ReactNode,footer?:React.ReactNode}){
 return <Sheet visible={visible} title={title} onClose={onClose} scroll={scroll}
  footer={<View style={{gap:10}}><Primary large label={doneLabel} disabled={doneDisabled} onPress={onDone}/>{footer}</View>}>
  <KeyboardAvoidingView behavior="padding">{children}</KeyboardAvoidingView>
 </Sheet>;
}

/** Grouped form label, iOS settings style. */
export function FormLabel({children}:{children:string}){return <Txt size={13} bold color={C.muted} style={{letterSpacing:0.2,marginTop:18,marginBottom:8}}>{children}</Txt>;}
