import { useState } from 'react';
import strings from '../../../../assets/lang/strings';
import { BaseModalProps } from '../../../types/ui';
import AppPoll from '../../AppPoll';
import BottomModal from '../BottomModal';

const DeleteAccountModal = (props: BaseModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <BottomModal isOpen={props.isOpen} onClosed={props.onClose}>
      <AppPoll
        title={strings.modals.DeleteAccountModal.poll.title}
        options={[]}
        advice={strings.modals.DeleteAccountModal.poll.advice}
      />
    </BottomModal>
  );
};

export default DeleteAccountModal;
